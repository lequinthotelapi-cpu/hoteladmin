/**
 * User Roles for Hotel PMS
 */
export enum UserRole {
  SUPERADMIN = 'superadmin',
  ADMIN = 'admin',
  MANAGER = 'manager',
  RECEPTIONIST = 'receptionist',
  HOUSEKEEPER = 'housekeeper',
  GUEST = 'guest'
}

/**
 * Role hierarchy for permission checking
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.SUPERADMIN]: 6,
  [UserRole.ADMIN]: 5,
  [UserRole.MANAGER]: 4,
  [UserRole.RECEPTIONIST]: 3,
  [UserRole.HOUSEKEEPER]: 2,
  [UserRole.GUEST]: 1
};
