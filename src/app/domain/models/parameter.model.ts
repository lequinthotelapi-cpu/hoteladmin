export interface ParameterOption {
  value: string;
  label: string;
  active: boolean;
  order: number;
  metadata?: Record<string, any>;
}

export interface ParameterCategory {
  id: string;
  name: string;
  description: string;
  options: ParameterOption[];
  updatedAt: Date;
  updatedBy?: string;
}

export interface CountryOption extends ParameterOption {
  code: string;
  dialCode: string;
}

export interface CurrencyOption extends ParameterOption {
  code: string;
  symbol: string;
}

export type ParameterCategoryId = 
  | 'documentTypes'
  | 'guestTypes'
  | 'guestStatuses'
  | 'roomTypes'
  | 'roomStatuses'
  | 'bedTypes'
  | 'amenities'
  | 'countries'
  | 'currencies'
  | 'paymentMethods'
  | 'reservationSources'
  | 'reservationStatuses'
  | 'productCategories'
  | 'measurementUnits'
  | 'expenseCategories'
  | 'movementReasons'
  | 'employeePositions'
  | 'employeeDepartments'
  | 'taskTypes'
  | 'taskPriorities'
  | 'maintenanceIssues';

export const PARAMETER_CATEGORIES: Record<ParameterCategoryId, { name: string; description: string }> = {
  documentTypes: {
    name: 'Tipos de Documento',
    description: 'Tipos de documentos de identidad'
  },
  guestTypes: {
    name: 'Tipos de Huésped',
    description: 'Clasificación de huéspedes'
  },
  guestStatuses: {
    name: 'Estados de Huésped',
    description: 'Estados posibles de un huésped'
  },
  roomTypes: {
    name: 'Tipos de Habitación',
    description: 'Categorías de habitaciones'
  },
  roomStatuses: {
    name: 'Estados de Habitación',
    description: 'Estados posibles de una habitación'
  },
  bedTypes: {
    name: 'Tipos de Cama',
    description: 'Tipos de camas disponibles'
  },
  amenities: {
    name: 'Amenidades',
    description: 'Servicios y comodidades'
  },
  countries: {
    name: 'Países',
    description: 'Lista de países'
  },
  currencies: {
    name: 'Monedas',
    description: 'Monedas aceptadas'
  },
  paymentMethods: {
    name: 'Métodos de Pago',
    description: 'Formas de pago disponibles'
  },
  reservationSources: {
    name: 'Fuentes de Reserva',
    description: 'Canales de origen de reservas'
  },
  reservationStatuses: {
    name: 'Estados de Reserva',
    description: 'Estados posibles de una reserva'
  },
  productCategories: {
    name: 'Categorías de Producto',
    description: 'Categorías de productos del inventario'
  },
  measurementUnits: {
    name: 'Unidades de Medida',
    description: 'Unidades de medida para productos'
  },
  expenseCategories: {
    name: 'Categorías de Gasto',
    description: 'Categorías de gastos operativos'
  },
  movementReasons: {
    name: 'Motivos de Movimiento',
    description: 'Motivos de movimientos de inventario'
  },
  employeePositions: {
    name: 'Cargos de Empleado',
    description: 'Cargos o posiciones de empleados'
  },
  employeeDepartments: {
    name: 'Departamentos',
    description: 'Departamentos del hotel'
  },
  taskTypes: {
    name: 'Tipos de Tarea',
    description: 'Tipos de tareas de housekeeping'
  },
  taskPriorities: {
    name: 'Prioridades de Tarea',
    description: 'Niveles de prioridad para tareas'
  },
  maintenanceIssues: {
    name: 'Problemas de Mantenimiento',
    description: 'Tipos comunes de problemas de mantenimiento'
  }
};
