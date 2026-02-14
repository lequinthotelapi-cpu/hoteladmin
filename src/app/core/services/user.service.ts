import { Injectable } from '@angular/core';
import {
  Auth,
  createUserWithEmailAndPassword,
  signOut,
  initializeAuth,
  indexedDBLocalPersistence
} from '@angular/fire/auth';
import { FirebaseApp } from '@angular/fire/app';
import {
  Firestore,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  collection
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { UserRepository } from '../../domain/repositories/user.repository';
import { User, CreateUserData, UpdateUserData } from '../../domain/models/user.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private secondaryAuth: Auth | null = null;

  constructor(
    private auth: Auth,
    private firestore: Firestore,
    private userRepository: UserRepository,
    private authService: AuthService,
    private app: FirebaseApp
  ) {}

  async createUser(userData: CreateUserData): Promise<User> {
    try {
      // Crear o reutilizar instancia secundaria de Auth
      if (!this.secondaryAuth) {
        this.secondaryAuth = initializeAuth(this.app, {
          persistence: indexedDBLocalPersistence
        });
      }

      // Crear usuario en la instancia secundaria
      const userCredential = await createUserWithEmailAndPassword(
        this.secondaryAuth,
        userData.email,
        userData.password
      );
      
      const uid = userCredential.user.uid;

      const user: User = {
        uid,
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        document: userData.document,
        gender: userData.gender,
        role: userData.role,
        active: userData.active ?? true,
        createdAt: new Date(),
        maxSessions: userData.maxSessions || 1,
        activeSessionsCount: 0,
        hasActiveSession: false
      };

      // Agregar campos opcionales
      if (userData.activeUntil) user.activeUntil = userData.activeUntil;
      if (userData.avatarUrl) user.avatarUrl = userData.avatarUrl;
      if (userData.position) user.position = userData.position;
      if (userData.department) user.department = userData.department;
      if (userData.phone) user.phone = userData.phone;
      if (userData.salary !== undefined) user.salary = userData.salary;
      if (userData.hireDate) user.hireDate = userData.hireDate;
      if (userData.emergencyContact) user.emergencyContact = userData.emergencyContact;

      // Crear documento en Firestore
      const userDocRef = doc(this.firestore, `users/${uid}`);
      await setDoc(userDocRef, {
        ...user,
        createdAt: serverTimestamp()
      });

      // Cerrar sesión de la instancia secundaria
      await signOut(this.secondaryAuth);

      return user;
    } catch (error: any) {
      if (error.code === 'auth/app-deleted' || error.code === 'auth/already-initialized') {
        // Si falla la instancia secundaria, usar método alternativo
        return await this.createUserFallback(userData);
      }
      throw error;
    }
  }

  private async createUserFallback(userData: CreateUserData): Promise<User> {
    // Método alternativo: crear solo en Firestore
    const uid = doc(this.firestore, 'users', 'temp').id;

    const user: User = {
      uid,
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      document: userData.document,
      gender: userData.gender,
      role: userData.role,
      active: userData.active ?? true,
      createdAt: new Date(),
      maxSessions: userData.maxSessions || 1,
      activeSessionsCount: 0,
      hasActiveSession: false,
      pendingActivation: true
    };

    if (userData.activeUntil) user.activeUntil = userData.activeUntil;
    if (userData.avatarUrl) user.avatarUrl = userData.avatarUrl;
    if (userData.position) user.position = userData.position;
    if (userData.department) user.department = userData.department;
    if (userData.phone) user.phone = userData.phone;
    if (userData.salary !== undefined) user.salary = userData.salary;
    if (userData.hireDate) user.hireDate = userData.hireDate;
    if (userData.emergencyContact) user.emergencyContact = userData.emergencyContact;

    const userDocRef = doc(this.firestore, `users/${uid}`);
    await setDoc(userDocRef, {
      ...user,
      createdAt: serverTimestamp()
    });

    return user;
  }

  getUser(uid: string): Observable<User | null> {
    return this.userRepository.getById(uid);
  }

  getAllUsers(): Observable<User[]> {
    return this.userRepository.getAll();
  }

  async updateUser(uid: string, userData: UpdateUserData): Promise<void> {
    const updateData: any = {
      ...userData,
      updatedAt: serverTimestamp()
    };
    
    await this.userRepository.update(uid, updateData);
  }

  async deleteUser(uid: string): Promise<void> {
    // Eliminar de Firestore
    const userDocRef = doc(this.firestore, `users/${uid}`);
    await deleteDoc(userDocRef);
    
    // Nota: No se puede eliminar de Firebase Auth desde el cliente
    // Requiere Cloud Function o Admin SDK
  }

  async toggleUserStatus(uid: string, active: boolean): Promise<void> {
    await this.updateUser(uid, { active });
  }

  async resetUserSessions(uid: string): Promise<void> {
    await this.authService.resetUserSessions(uid);
  }

  async cleanupInactiveSessions(uid: string, timeoutMinutes: number = 5): Promise<void> {
    await this.authService.cleanupInactiveSessions(uid, timeoutMinutes);
  }

  async forceLogoutUser(uid: string): Promise<void> {
    await this.authService.forceLogoutUser(uid);
  }

  async fixSessionRoles(uid: string): Promise<void> {
    await this.authService.fixSessionRoles(uid);
  }

  getUsersByRole(role: string): Observable<User[]> {
    return this.userRepository.getByRole(role);
  }
}
