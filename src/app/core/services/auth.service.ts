import { Injectable } from '@angular/core';
import {
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  user,
  User as FirebaseUser,
  sendPasswordResetEmail
} from '@angular/fire/auth';
import {
  Firestore,
  doc,
  getDoc,
  updateDoc,
  runTransaction,
  serverTimestamp,
  deleteField
} from '@angular/fire/firestore';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { Observable, firstValueFrom } from 'rxjs';
import { UserRepository } from '../../domain/repositories/user.repository';
import { User } from '../../domain/models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  user$: Observable<FirebaseUser | null> = user(this.auth);
  private sessionId: string | null = null;
  private heartbeatInterval: any = null;

  constructor(
    private auth: Auth,
    private firestore: Firestore,
    private functions: Functions,
    private userRepository: UserRepository
  ) {
    // Limpiar sesión cuando se cierra/recarga la página
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.cleanupCurrentSession();
      });
    }
  }

  async signIn(email: string, password: string) {
    const result = await signInWithEmailAndPassword(this.auth, email, password);
    await this.ensureUserDocument(result.user);
    
    const uid = result.user.uid;
    const userRef = doc(this.firestore, `users/${uid}`);
    this.sessionId = this.generateSessionId();

    try {
      await runTransaction(this.firestore, async tx => {
        const snap = await tx.get(userRef);
        const data = snap.data() || {};
        
        // Verificar si usuario está activo
        if (data['active'] === false) {
          throw new Error('USER_INACTIVE');
        }

        // Verificar fecha de expiración
        if (data['activeUntil']) {
          const activeUntil = data['activeUntil'].toDate();
          if (activeUntil < new Date()) {
            throw new Error('USER_EXPIRED');
          }
        }
        
        // Superadmin no tiene límite de sesiones
        const isSuperadmin = data['role'] === 'superadmin';

        // Limpiar sesiones inactivas DENTRO de la transacción
        const sessions = data['sessions'] || {};
        const now = Date.now();
        const timeoutMs = 15 * 60 * 1000; // 15 minutos
        let inactiveCount = 0;
        const sessionUpdates: any = {};
        
        if (!isSuperadmin) {
          for (const [sessionId, sessionData] of Object.entries(sessions)) {
            const lastHeartbeat = (sessionData as any)?.lastHeartbeat;
            if (lastHeartbeat) {
              const lastHeartbeatTime = lastHeartbeat.seconds ? lastHeartbeat.seconds * 1000 : lastHeartbeat;
              if (now - lastHeartbeatTime > timeoutMs) {
                sessionUpdates[`sessions.${sessionId}`] = deleteField();
                inactiveCount++;
              }
            }
          }
        }

        // Calcular contador real después de limpieza
        const currentCount = (data['activeSessionsCount'] || 0) - inactiveCount;
        const realCount = Math.max(currentCount, 0);

        if (!isSuperadmin) {
          const max = data['maxSessions'] || 1;
          if (realCount >= max) {
            throw new Error('MAX_SESSIONS');
          }
        }

        // Crear nueva sesión
        const newCount = realCount + 1;
        const userRole = data['role'] || 'guest';

        // updateDoc (no setDoc+merge) — necesario para que las claves con punto
        // ("sessions.{id}") se interpreten como ruta anidada dentro del mapa
        // `sessions` en vez de como el nombre literal de un campo nuevo (bug
        // detectado durante SPEC-05: setDoc(...,{merge:true}) con clave punteada
        // crea un campo top-level llamado literalmente "sessions.abc", no un
        // mapa anidado — updateDoc/tx.update() sí lo interpretan correctamente).
        tx.update(userRef, {
          ...sessionUpdates,
          activeSessionsCount: newCount,
          hasActiveSession: true,
          [`sessions.${this.sessionId}`]: {
            createdAt: serverTimestamp(),
            lastHeartbeat: serverTimestamp(),
            role: userRole
          }
        });
      });
      
      this.startHeartbeat(uid);
      localStorage.setItem('isLoggedIn', 'true');
    } catch (e: any) {
      await signOut(this.auth);
      if (e.message === 'MAX_SESSIONS') {
        throw new Error('Límite de sesiones alcanzado. Cierra otra sesión e intenta nuevamente.');
      }
      if (e.message === 'USER_INACTIVE') {
        throw new Error('Usuario inactivo. Contacta al administrador.');
      }
      if (e.message === 'USER_EXPIRED') {
        throw new Error('Tu cuenta ha expirado. Contacta al administrador.');
      }
      throw e;
    }
    
    return result;
  }

  async signUp(email: string, password: string) {
    const result = await createUserWithEmailAndPassword(this.auth, email, password);
    await this.ensureUserDocument(result.user);
    return result;
  }

  async signOut() {
    this.stopHeartbeat();
    
    const uid = this.auth.currentUser?.uid;
    const sessionId = this.sessionId;
    
    if (uid && sessionId) {
      const userRef = doc(this.firestore, `users/${uid}`);
      
      try {
        await runTransaction(this.firestore, async tx => {
          const snap = await tx.get(userRef);
          const data = snap.data();
          const active = data?.['activeSessionsCount'] || 0;
          const newCount = Math.max(active - 1, 0);
          
          tx.update(userRef, {
            activeSessionsCount: newCount,
            hasActiveSession: newCount > 0,
            [`sessions.${sessionId}`]: deleteField()
          });
        });
      } catch (error) {
        console.error('Error al limpiar sesión:', error);
      }
    }
    
    this.sessionId = null;
    localStorage.removeItem('isLoggedIn');
    return await signOut(this.auth);
  }

  getCurrentUser() {
    return this.auth.currentUser;
  }

  async getUserData(uid: string): Promise<User | null> {
    try {
      return await firstValueFrom(this.userRepository.getById(uid));
    } catch (error) {
      console.error('Error obteniendo datos de usuario:', error);
      return null;
    }
  }

  async resetPassword(email: string): Promise<void> {
    return await sendPasswordResetEmail(this.auth, email);
  }

  async resetUserSessions(uid: string): Promise<void> {
    const userRef = doc(this.firestore, `users/${uid}`);
    
    // Primero obtener todas las sesiones para eliminarlas una por una
    const snap = await getDoc(userRef);
    const data = snap.data();
    
    if (data && data['sessions']) {
      const sessions = data['sessions'];
      const updates: any = {
        activeSessionsCount: 0,
        hasActiveSession: false
      };
      
      // Eliminar cada sesión individualmente
      for (const sessionId of Object.keys(sessions)) {
        updates[`sessions.${sessionId}`] = deleteField();
      }
      
      // También eliminar los campos duplicados de lastHeartbeat si existen
      // (residuo del bug de setDoc+merge con clave punteada — ver signIn arriba)
      for (const key of Object.keys(data)) {
        if (key.startsWith('sessions.') && key.includes('.lastHeartbeat')) {
          updates[key] = deleteField();
        }
      }

      await updateDoc(userRef, updates);
    } else {
      // Si no hay sesiones, solo resetear los contadores
      await updateDoc(userRef, {
        activeSessionsCount: 0,
        hasActiveSession: false
      });
    }
  }

  async cleanupInactiveSessions(uid: string, timeoutMinutes: number = 5): Promise<void> {
    const userRef = doc(this.firestore, `users/${uid}`);
    const snap = await getDoc(userRef);
    const data = snap.data();
    
    if (!data || !data['sessions']) return;
    
    const isSuperadmin = data['role'] === 'superadmin';
    if (isSuperadmin) return;
    
    const sessions = data['sessions'];
    const now = Date.now();
    const timeoutMs = timeoutMinutes * 60 * 1000;
    let inactiveCount = 0;
    
    const updates: any = {};
    
    for (const [sessionId, sessionData] of Object.entries(sessions)) {
      const lastHeartbeat = (sessionData as any)?.lastHeartbeat;
      if (lastHeartbeat) {
        const lastHeartbeatTime = lastHeartbeat.seconds ? lastHeartbeat.seconds * 1000 : lastHeartbeat;
        if (now - lastHeartbeatTime > timeoutMs) {
          updates[`sessions.${sessionId}`] = deleteField();
          inactiveCount++;
        }
      }
    }
    
    if (inactiveCount > 0) {
      await runTransaction(this.firestore, async tx => {
        const snap = await tx.get(userRef);
        const active = snap.data()?.['activeSessionsCount'] || 0;
        const newCount = Math.max(active - inactiveCount, 0);
        
        tx.update(userRef, {
          ...updates,
          activeSessionsCount: newCount,
          hasActiveSession: newCount > 0
        });
      });
    }
  }

  private async ensureUserDocument(firebaseUser: FirebaseUser) {
    try {
      const userRef = doc(this.firestore, `users/${firebaseUser.uid}`);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        const newUser: User = {
          uid: firebaseUser.uid,
          firstName: firebaseUser.displayName?.split(' ')[0] || 'Usuario',
          lastName: firebaseUser.displayName?.split(' ').slice(1).join(' ') || '',
          email: firebaseUser.email!,
          document: '',
          gender: 'masculino',
          role: 'guest',
          active: true,
          createdAt: new Date(),
          maxSessions: 1,
          activeSessionsCount: 0,
          hasActiveSession: false
        };
        
        await this.userRepository.create(newUser);
      } else {
        // Si el usuario existe pero no tiene maxSessions, agregarlo
        const userData = userSnap.data();
        if (!userData['maxSessions']) {
          await updateDoc(userRef, { maxSessions: 1 });
        }
      }
    } catch (error) {
      console.error('Error ensuring user document:', error);
      throw error;
    }
  }

  private generateSessionId(): string {
    return `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private startHeartbeat(uid: string): void {
    this.stopHeartbeat();
    
    this.heartbeatInterval = setInterval(async () => {
      if (this.sessionId) {
        const userRef = doc(this.firestore, `users/${uid}`);
        try {
          await updateDoc(userRef, {
            [`sessions.${this.sessionId}.lastHeartbeat`]: serverTimestamp()
          });
        } catch (error) {
          console.error('Error enviando heartbeat:', error);
        }
      }
    }, 300000); // 5 minutos (300 segundos)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private cleanupCurrentSession(): void {
    const uid = this.auth.currentUser?.uid;
    if (uid && this.sessionId) {
      const userRef = doc(this.firestore, `users/${uid}`);
      
      // Usar navigator.sendBeacon para enviar datos antes de cerrar
      const data = {
        sessionId: this.sessionId,
        uid: uid
      };
      
      // Intentar limpieza síncrona (puede no completarse)
      try {
        const updates: any = {};
        updates[`sessions.${this.sessionId}`] = deleteField();
        updateDoc(userRef, updates);
      } catch (error) {
        console.error('Error limpiando sesión:', error);
      }
    }
  }

  async saveFCMToken(token: string) {
    const firebaseUser = this.getCurrentUser();
    if (firebaseUser) {
      await this.userRepository.update(firebaseUser.uid, { 
        fcmToken: token 
      } as any);
    }
  }

  async forceLogoutUser(uid: string): Promise<void> {
    const forceLogout = httpsCallable(this.functions, 'forceLogoutUser');
    await forceLogout({ uid });
  }

  async fixSessionRoles(uid: string): Promise<void> {
    const userRef = doc(this.firestore, `users/${uid}`);
    const snap = await getDoc(userRef);
    const data = snap.data();
    
    if (!data || !data['sessions']) return;
    
    const userRole = data['role'];
    const sessions = data['sessions'];
    const updates: any = {};
    
    // Actualizar el rol en todas las sesiones
    for (const sessionId of Object.keys(sessions)) {
      updates[`sessions.${sessionId}.role`] = userRole;
    }
    
    if (Object.keys(updates).length > 0) {
      await updateDoc(userRef, updates);
    }
  }
}