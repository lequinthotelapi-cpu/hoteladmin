import { HttpsError } from 'firebase-functions/v2/https';

const getMock = jest.fn();

jest.mock('firebase-admin', () => ({
  firestore: () => ({
    collection: () => ({
      doc: () => ({
        get: getMock,
      }),
    }),
  }),
}));

import { requireRole } from './auth-context';

describe('requireRole', () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it('rechaza si no hay auth (sin auth)', async () => {
    await expect(requireRole(undefined, ['admin'])).rejects.toThrow(HttpsError);
    await expect(requireRole(undefined, ['admin'])).rejects.toMatchObject({ code: 'unauthenticated' });
  });

  it('rechaza si el rol del caller no está en la lista permitida', async () => {
    getMock.mockResolvedValue({ data: () => ({ role: 'housekeeper' }) });
    const auth = { uid: 'user-1' } as any;

    await expect(requireRole(auth, ['admin', 'superadmin'])).rejects.toMatchObject({
      code: 'permission-denied',
    });
  });

  it('rechaza si el usuario no tiene documento/rol en Firestore', async () => {
    getMock.mockResolvedValue({ data: () => undefined });
    const auth = { uid: 'user-1' } as any;

    await expect(requireRole(auth, ['admin'])).rejects.toMatchObject({ code: 'permission-denied' });
  });

  it('permite y devuelve el contexto si el rol está en la lista permitida', async () => {
    getMock.mockResolvedValue({ data: () => ({ role: 'admin' }) });
    const auth = { uid: 'user-1' } as any;

    const ctx = await requireRole(auth, ['admin', 'superadmin']);

    expect(ctx).toEqual({ uid: 'user-1', role: 'admin' });
  });
});
