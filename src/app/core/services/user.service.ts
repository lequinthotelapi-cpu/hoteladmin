import { Injectable } from '@angular/core';
import {
  Auth,
  getAuth,
  createUserWithEmailAndPassword,
  signOut
} from '@angular/fire/auth';
import { FirebaseApp, initializeApp, getApps } from '@angular/fire/app';
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
import { environment } from '../../../environments/environment';

const SECONDARY_APP_NAME = 'Secondary';

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

  /**
   * Crear usuarios usa una segunda FirebaseApp con su propio Auth, aislada
   * de `this.auth` (la sesión del admin). Sin esto, createUserWithEmailAndPassword
   * deja al navegador autenticado como el usuario recién creado en vez del admin.
   * Al tener un nombre de app distinto, Firebase guarda su sesión bajo una
   * clave de almacenamiento separada de la del admin, así que no hace falta
   * tocar la persistencia para evitar interferencias.
   */
  private getSecondaryAuth(): Auth {
    if (!this.secondaryAuth) {
      const existingApp = getApps().find(a => a.name === SECONDARY_APP_NAME);
      const secondaryApp = existingApp ?? initializeApp(environment.firebaseConfig, SECONDARY_APP_NAME);
      this.secondaryAuth = getAuth(secondaryApp);
    }
    return this.secondaryAuth;
  }

  async createUser(userData: CreateUserData): Promise<User> {
    const secondaryAuth = this.getSecondaryAuth();

    const userCredential = await createUserWithEmailAndPassword(
      secondaryAuth,
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

    try {
      // Crear documento en Firestore
      const userDocRef = doc(this.firestore, `users/${uid}`);
      await setDoc(userDocRef, {
        ...user,
        createdAt: serverTimestamp()
      });
    } finally {
      // Pase lo que pase con Firestore, cerrar la sesión de la app
      // secundaria para no dejar credenciales del usuario nuevo colgando.
      await signOut(secondaryAuth);
    }

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

  async sendPasswordReset(email: string): Promise<void> {
    await this.authService.resetPassword(email);
  }

  getUsersByRole(role: string): Observable<User[]> {
    return this.userRepository.getByRole(role);
  }
}
