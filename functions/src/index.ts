import * as admin from 'firebase-admin';

admin.initializeApp();

export { forceLogoutUser } from './auth/force-logout';
export { crearReserva } from './bookings/crear-reserva';
