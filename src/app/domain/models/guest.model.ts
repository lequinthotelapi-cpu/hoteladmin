export interface Companion {
  firstName: string;
  lastName: string;
  relationship?: string;
  age?: number;
}

export interface Guest {
  // Identificación
  id: string;
  
  // Información Personal Básica (REQUERIDOS)
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  
  // Documento de Identidad (REQUERIDOS)
  documentType: string;        // Valor de parámetro 'documentTypes'
  documentNumber: string;
  
  // Clasificación (REQUERIDOS)
  guestType: string;           // Valor de parámetro 'guestTypes'
  status: string;              // Valor de parámetro 'guestStatuses'
  vip: boolean;
  
  // Información Adicional (OPCIONALES)
  dateOfBirth?: Date;
  countryOfOrigin?: string;    // País de origen - Valor de parámetro 'countries'
  gender?: 'masculino' | 'femenino' | 'otro';
  alternativePhone?: string;
  photoUrl?: string;           // URL de la foto del huésped
  
  // Dirección (OPCIONALES)
  address?: string;
  city?: string;
  country?: string;            // País de residencia - Valor de parámetro 'countries'
  
  // Acompañantes (OPCIONALES)
  companions?: Companion[];
  
  // Notas (OPCIONALES)
  notes?: string;
  
  // Auditoría
  createdAt: Date;
  updatedAt?: Date;
  createdBy: string;
  updatedBy?: string;
}

export interface CreateGuestData {
  // Requeridos
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  documentType: string;
  documentNumber: string;
  guestType: string;
  status: string;
  vip: boolean;
  
  // Opcionales
  dateOfBirth?: Date;
  countryOfOrigin?: string;
  gender?: 'masculino' | 'femenino' | 'otro';
  alternativePhone?: string;
  photoUrl?: string;
  address?: string;
  city?: string;
  country?: string;
  companions?: Companion[];
  notes?: string;
  
  // Auditoría
  createdBy?: string;
}

export interface UpdateGuestData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  documentType?: string;
  documentNumber?: string;
  guestType?: string;
  status?: string;
  vip?: boolean;
  dateOfBirth?: Date;
  countryOfOrigin?: string;
  gender?: 'masculino' | 'femenino' | 'otro';
  alternativePhone?: string;
  photoUrl?: string;
  address?: string;
  city?: string;
  country?: string;
  companions?: Companion[];
  notes?: string;
  
  // Auditoría
  updatedBy?: string;
}
