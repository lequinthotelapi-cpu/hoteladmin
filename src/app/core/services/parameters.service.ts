import { Injectable } from '@angular/core';
import { Firestore, doc, getDoc, setDoc, collection, getDocs, serverTimestamp, Timestamp } from '@angular/fire/firestore';
import { BehaviorSubject, Observable } from 'rxjs';
import { ParameterCategory, ParameterOption, ParameterCategoryId, PARAMETER_CATEGORIES } from '../../domain/models/parameter.model';

@Injectable({
  providedIn: 'root'
})
export class ParametersService {
  private parametersCache = new Map<ParameterCategoryId, ParameterCategory>();
  private loadedSubject = new BehaviorSubject<boolean>(false);
  public loaded$ = this.loadedSubject.asObservable();

  constructor(private firestore: Firestore) {}

  isLoaded(): boolean {
    return this.loadedSubject.value;
  }

  async forceRecreateAllParameters(): Promise<void> {
    // Limpiar caché
    this.parametersCache.clear();
    this.loadedSubject.next(false);
    
    // Recrear todos los parámetros
    await this.initializeDefaultParameters();
    
    // Marcar como cargado
    this.loadedSubject.next(true);
  }

  async loadAllParameters(): Promise<void> {
    try {
      const parametersRef = collection(this.firestore, 'parameters');
      const snapshot = await getDocs(parametersRef);
      
      if (snapshot.empty) {
        await this.initializeDefaultParameters();
      } else {
        snapshot.forEach(docSnap => {
          const data = docSnap.data() as ParameterCategory;
          const category = {
            ...data,
            id: docSnap.id,
            updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data.updatedAt
          };
          this.parametersCache.set(docSnap.id as ParameterCategoryId, category);
        });
      }
      
      this.loadedSubject.next(true);
    } catch (error) {
      console.error('Error loading parameters:', error);
      throw error;
    }
  }

  getCategory(categoryId: ParameterCategoryId): ParameterCategory | null {
    return this.parametersCache.get(categoryId) || null;
  }

  getOptions(categoryId: ParameterCategoryId): ParameterOption[] {
    const category = this.parametersCache.get(categoryId);
    return category?.options.filter(opt => opt.active).sort((a, b) => a.order - b.order) || [];
  }

  getAllCategories(): ParameterCategory[] {
    return Array.from(this.parametersCache.values());
  }

  async updateCategory(categoryId: ParameterCategoryId, options: ParameterOption[], updatedBy: string): Promise<void> {
    const categoryInfo = PARAMETER_CATEGORIES[categoryId];
    const docRef = doc(this.firestore, `parameters/${categoryId}`);
    
    const category: ParameterCategory = {
      id: categoryId,
      name: categoryInfo.name,
      description: categoryInfo.description,
      options: options.map((opt, index) => ({ ...opt, order: index })),
      updatedAt: new Date(),
      updatedBy
    };

    await setDoc(docRef, {
      ...category,
      updatedAt: serverTimestamp()
    });

    this.parametersCache.set(categoryId, category);
  }

  private async initializeDefaultParameters(): Promise<void> {
    const defaults: Record<ParameterCategoryId, ParameterOption[]> = {
      documentTypes: [
        { value: 'passport', label: 'Pasaporte', active: true, order: 0 },
        { value: 'id', label: 'Cédula de Ciudadanía', active: true, order: 1 },
        { value: 'license', label: 'Licencia de Conducir', active: true, order: 2 },
        { value: 'other', label: 'Otro', active: true, order: 3 }
      ],
      guestTypes: [
        { value: 'individual', label: 'Individual', active: true, order: 0 },
        { value: 'corporate', label: 'Corporativo', active: true, order: 1 },
        { value: 'group', label: 'Grupo', active: true, order: 2 }
      ],
      guestStatuses: [
        { value: 'active', label: 'Activo', active: true, order: 0 },
        { value: 'inactive', label: 'Inactivo', active: true, order: 1 },
        { value: 'blacklisted', label: 'Lista Negra', active: true, order: 2 }
      ],
      roomTypes: [
        { value: 'standard', label: 'Estándar', active: true, order: 0 },
        { value: 'deluxe', label: 'Deluxe', active: true, order: 1 },
        { value: 'suite', label: 'Suite', active: true, order: 2 },
        { value: 'presidential', label: 'Presidencial', active: true, order: 3 }
      ],
      roomStatuses: [
        { value: 'available', label: 'Disponible', active: true, order: 0 },
        { value: 'reserved', label: 'Reservada', active: true, order: 1 },
        { value: 'occupied', label: 'Ocupada', active: true, order: 2 },
        { value: 'dirty', label: 'Sucia', active: true, order: 3 },
        { value: 'cleaning', label: 'En Limpieza', active: true, order: 4 },
        { value: 'maintenance', label: 'Mantenimiento', active: true, order: 5 },
        { value: 'blocked', label: 'Bloqueada', active: true, order: 6 }
      ],
      bedTypes: [
        { value: 'single', label: 'Individual', active: true, order: 0 },
        { value: 'double', label: 'Doble', active: true, order: 1 },
        { value: 'queen', label: 'Queen', active: true, order: 2 },
        { value: 'king', label: 'King', active: true, order: 3 },
        { value: 'twin', label: 'Twin', active: true, order: 4 }
      ],
      amenities: [
        { value: 'wifi', label: 'WiFi', active: true, order: 0 },
        { value: 'tv', label: 'TV', active: true, order: 1 },
        { value: 'minibar', label: 'Minibar', active: true, order: 2 },
        { value: 'ac', label: 'Aire Acondicionado', active: true, order: 3 },
        { value: 'safe', label: 'Caja Fuerte', active: true, order: 4 }
      ],
      countries: [
        { value: 'CO', label: 'Colombia', active: true, order: 0, metadata: { dialCode: '+57' } },
        { value: 'US', label: 'Estados Unidos', active: true, order: 1, metadata: { dialCode: '+1' } },
        { value: 'MX', label: 'México', active: true, order: 2, metadata: { dialCode: '+52' } }
      ],
      currencies: [
        { value: 'COP', label: 'Peso Colombiano', active: true, order: 0, metadata: { symbol: '$' } },
        { value: 'USD', label: 'Dólar', active: true, order: 1, metadata: { symbol: '$' } },
        { value: 'EUR', label: 'Euro', active: true, order: 2, metadata: { symbol: '€' } }
      ],
      paymentMethods: [
        { value: 'cash', label: 'Efectivo', active: true, order: 0 },
        { value: 'card', label: 'Tarjeta', active: true, order: 1 },
        { value: 'transfer', label: 'Transferencia', active: true, order: 2 },
        { value: 'online', label: 'Pago Online', active: true, order: 3 }
      ],
      reservationSources: [
        { value: 'direct', label: 'Directo', active: true, order: 0 },
        { value: 'website', label: 'Sitio Web', active: true, order: 1 },
        { value: 'booking', label: 'Booking.com', active: true, order: 2 },
        { value: 'airbnb', label: 'Airbnb', active: true, order: 3 },
        { value: 'expedia', label: 'Expedia', active: true, order: 4 }
      ],
      reservationStatuses: [
        { value: 'pending', label: 'Pendiente', active: true, order: 0 },
        { value: 'confirmed', label: 'Confirmada', active: true, order: 1 },
        { value: 'checked-in', label: 'Check-in', active: true, order: 2 },
        { value: 'checked-out', label: 'Check-out', active: true, order: 3 },
        { value: 'cancelled', label: 'Cancelada', active: true, order: 4 },
        { value: 'no-show', label: 'No Show', active: true, order: 5 }
      ],
      productCategories: [
        { value: 'beverages', label: 'Bebidas', active: true, order: 0 },
        { value: 'food', label: 'Alimentos', active: true, order: 1 },
        { value: 'cleaning', label: 'Productos de Aseo', active: true, order: 2 },
        { value: 'amenities', label: 'Amenidades', active: true, order: 3 },
        { value: 'other', label: 'Otros', active: true, order: 4 }
      ],
      measurementUnits: [
        { value: 'unit', label: 'Unidad', active: true, order: 0 },
        { value: 'box', label: 'Caja', active: true, order: 1 },
        { value: 'liter', label: 'Litro', active: true, order: 2 },
        { value: 'kilogram', label: 'Kilogramo', active: true, order: 3 },
        { value: 'gram', label: 'Gramo', active: true, order: 4 },
        { value: 'pack', label: 'Paquete', active: true, order: 5 }
      ],
      expenseCategories: [
        { value: 'utilities', label: 'Servicios Públicos', active: true, order: 0 },
        { value: 'maintenance', label: 'Mantenimiento', active: true, order: 1 },
        { value: 'cleaning', label: 'Limpieza', active: true, order: 2 },
        { value: 'salaries', label: 'Salarios', active: true, order: 3 },
        { value: 'supplies', label: 'Suministros', active: true, order: 4 },
        { value: 'marketing', label: 'Marketing', active: true, order: 5 },
        { value: 'other', label: 'Otros', active: true, order: 6 }
      ],
      movementReasons: [
        { value: 'purchase', label: 'Compra', active: true, order: 0 },
        { value: 'sale', label: 'Venta', active: true, order: 1 },
        { value: 'waste', label: 'Merma', active: true, order: 2 },
        { value: 'adjustment', label: 'Ajuste', active: true, order: 3 },
        { value: 'internal', label: 'Consumo Interno', active: true, order: 4 },
        { value: 'return', label: 'Devolución', active: true, order: 5 }
      ],
      employeePositions: [
        { value: 'receptionist', label: 'Recepcionista', active: true, order: 0 },
        { value: 'housekeeper', label: 'Camarera', active: true, order: 1 },
        { value: 'maintenance', label: 'Mantenimiento', active: true, order: 2 },
        { value: 'manager', label: 'Gerente', active: true, order: 3 },
        { value: 'chef', label: 'Chef', active: true, order: 4 },
        { value: 'waiter', label: 'Mesero', active: true, order: 5 },
        { value: 'security', label: 'Seguridad', active: true, order: 6 }
      ],
      employeeDepartments: [
        { value: 'reception', label: 'Recepción', active: true, order: 0 },
        { value: 'housekeeping', label: 'Housekeeping', active: true, order: 1 },
        { value: 'maintenance', label: 'Mantenimiento', active: true, order: 2 },
        { value: 'administration', label: 'Administración', active: true, order: 3 },
        { value: 'restaurant', label: 'Restaurante', active: true, order: 4 },
        { value: 'security', label: 'Seguridad', active: true, order: 5 }
      ],
      taskTypes: [
        { value: 'cleaning', label: 'Limpieza', active: true, order: 0 },
        { value: 'maintenance', label: 'Mantenimiento', active: true, order: 1 },
        { value: 'inspection', label: 'Inspección', active: true, order: 2 },
        { value: 'deep-cleaning', label: 'Limpieza Profunda', active: true, order: 3 }
      ],
      taskPriorities: [
        { value: 'low', label: 'Baja', active: true, order: 0 },
        { value: 'normal', label: 'Normal', active: true, order: 1 },
        { value: 'high', label: 'Alta', active: true, order: 2 },
        { value: 'urgent', label: 'Urgente', active: true, order: 3 }
      ],
      maintenanceIssues: [
        { value: 'plumbing', label: 'Plomería', active: true, order: 0 },
        { value: 'electrical', label: 'Eléctrico', active: true, order: 1 },
        { value: 'ac', label: 'Aire Acondicionado', active: true, order: 2 },
        { value: 'furniture', label: 'Mobiliario', active: true, order: 3 },
        { value: 'appliances', label: 'Electrodomésticos', active: true, order: 4 },
        { value: 'painting', label: 'Pintura', active: true, order: 5 },
        { value: 'other', label: 'Otro', active: true, order: 6 }
      ]
    };

    for (const [categoryId, options] of Object.entries(defaults)) {
      const categoryInfo = PARAMETER_CATEGORIES[categoryId as ParameterCategoryId];
      const docRef = doc(this.firestore, `parameters/${categoryId}`);
      
      const category: ParameterCategory = {
        id: categoryId,
        name: categoryInfo.name,
        description: categoryInfo.description,
        options,
        updatedAt: new Date()
      };

      await setDoc(docRef, {
        ...category,
        updatedAt: serverTimestamp()
      });

      this.parametersCache.set(categoryId as ParameterCategoryId, category);
    }
  }
}
