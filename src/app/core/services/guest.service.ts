import { Injectable, Inject, forwardRef } from '@angular/core';
import { Observable } from 'rxjs';
import { GuestRepository } from '../repositories/guest.repository';
import { Guest, CreateGuestData, UpdateGuestData } from '../../domain/models/guest.model';
import { AuthService } from './auth.service';

@Injectable()
export class GuestService {
  constructor(
    private repository: GuestRepository,
    private authService: AuthService
  ) {}

  getAll(): Observable<Guest[]> {
    return this.repository.getAll();
  }

  getById(id: string): Observable<Guest | null> {
    return this.repository.getById(id);
  }

  async create(data: CreateGuestData): Promise<string> {
    await this.validateCreate(data);
    
    const currentUser = await this.authService.getCurrentUser();
    const guestData: CreateGuestData = {
      ...data,
      createdBy: currentUser?.uid || 'system'
    };
    
    return await this.repository.create(guestData);
  }

  async update(id: string, data: UpdateGuestData): Promise<void> {
    await this.validateUpdate(id, data);
    
    const currentUser = await this.authService.getCurrentUser();
    const updateData: UpdateGuestData = {
      ...data,
      updatedBy: currentUser?.uid || 'system'
    };
    
    await this.repository.update(id, updateData);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async toggleVipStatus(id: string, vip: boolean): Promise<void> {
    const currentUser = await this.authService.getCurrentUser();
    const userData = currentUser ? await this.authService.getUserData(currentUser.uid) : null;
    
    if (!userData || (userData.role !== 'admin' && userData.role !== 'superadmin')) {
      throw new Error('Solo administradores pueden cambiar el estado VIP');
    }
    
    await this.update(id, { vip });
  }

  private async validateCreate(data: CreateGuestData): Promise<void> {
    if (!this.isValidEmail(data.email)) {
      throw new Error('Formato de email inválido');
    }

    if (!this.isValidPhone(data.phone)) {
      throw new Error('Formato de teléfono inválido');
    }

    const existingEmail = await this.repository.searchByEmail(data.email);
    if (existingEmail) {
      throw new Error('Ya existe un huésped con este email');
    }

    const existingDocument = await this.repository.searchByDocument(data.documentType, data.documentNumber);
    if (existingDocument) {
      throw new Error('Ya existe un huésped con este tipo y número de documento');
    }

    if (data.vip) {
      const currentUser = await this.authService.getCurrentUser();
      const userData = currentUser ? await this.authService.getUserData(currentUser.uid) : null;
      
      if (!userData || (userData.role !== 'admin' && userData.role !== 'superadmin')) {
        throw new Error('Solo administradores pueden crear huéspedes VIP');
      }
    }
  }

  private async validateUpdate(id: string, data: UpdateGuestData): Promise<void> {
    if (data.email && !this.isValidEmail(data.email)) {
      throw new Error('Formato de email inválido');
    }

    if (data.phone && !this.isValidPhone(data.phone)) {
      throw new Error('Formato de teléfono inválido');
    }

    if (data.email) {
      const existingEmail = await this.repository.searchByEmail(data.email);
      if (existingEmail && existingEmail.id !== id) {
        throw new Error('Ya existe un huésped con este email');
      }
    }

    if (data.documentType && data.documentNumber) {
      const existingDocument = await this.repository.searchByDocument(data.documentType, data.documentNumber);
      if (existingDocument && existingDocument.id !== id) {
        throw new Error('Ya existe un huésped con este tipo y número de documento');
      }
    }

    if (data.vip !== undefined) {
      const currentUser = await this.authService.getCurrentUser();
      const userData = currentUser ? await this.authService.getUserData(currentUser.uid) : null;
      
      if (!userData || (userData.role !== 'admin' && userData.role !== 'superadmin')) {
        throw new Error('Solo administradores pueden cambiar el estado VIP');
      }
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidPhone(phone: string): boolean {
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 7;
  }
}
