export type UserRole = 'superadmin' | 'admin' | 'manager' | 'receptionist' | 'housekeeper' | 'guest';
export type Gender = 'masculino' | 'femenino';

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export interface User {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  document: string;
  gender: Gender;
  role: UserRole;
  active: boolean;
  activeUntil?: Date;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt?: Date;
  maxSessions?: number;
  activeSessionsCount?: number;
  hasActiveSession?: boolean;
  sessions?: Record<string, SessionData>;
  lastHeartbeat?: any;

  // Employee fields
  position?: string;
  department?: string;
  salary?: number;
  hireDate?: Date;
  phone?: string;
  emergencyContact?: EmergencyContact;
}

export interface SessionData {
  createdAt: any;
  lastHeartbeat: any;
  role: UserRole;
}

export interface CreateUserData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  document: string;
  gender: Gender;
  role: UserRole;
  active?: boolean;
  activeUntil?: Date;
  avatarUrl?: string;
  maxSessions?: number;
  
  // Employee fields
  position?: string;
  department?: string;
  salary?: number;
  hireDate?: Date;
  phone?: string;
  emergencyContact?: EmergencyContact;
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  document?: string;
  gender?: Gender;
  role?: UserRole;
  active?: boolean;
  activeUntil?: Date;
  avatarUrl?: string;
  maxSessions?: number;
  activeSessionsCount?: number;
  hasActiveSession?: boolean;
  
  // Employee fields
  position?: string;
  department?: string;
  salary?: number;
  hireDate?: Date;
  phone?: string;
  emergencyContact?: EmergencyContact;
}