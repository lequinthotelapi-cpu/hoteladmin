const userDocs: Record<string, { role?: string } | undefined> = {};
const updateMock = jest.fn();
const revokeRefreshTokensMock = jest.fn();

jest.mock('firebase-admin', () => ({
  firestore: () => ({
    collection: () => ({
      doc: (uid: string) => ({
        get: async () => ({ data: () => userDocs[uid] }),
        update: (...args: any[]) => updateMock(uid, ...args),
      }),
    }),
  }),
  auth: () => ({
    revokeRefreshTokens: revokeRefreshTokensMock,
  }),
}));

import { forceLogoutUser } from './force-logout';

function callRun(request: any) {
  return (forceLogoutUser as any).run(request);
}

describe('forceLogoutUser (comportamiento preservado tras extraer requireRole)', () => {
  beforeEach(() => {
    for (const key of Object.keys(userDocs)) delete userDocs[key];
    updateMock.mockReset();
    revokeRefreshTokensMock.mockReset().mockResolvedValue(undefined);
  });

  it('rechaza si no hay auth', async () => {
    await expect(callRun({ data: {}, auth: undefined })).rejects.toMatchObject({
      code: 'unauthenticated',
    });
  });

  it('rechaza si el caller no es admin/superadmin', async () => {
    userDocs['caller-1'] = { role: 'receptionist' };

    await expect(
      callRun({ data: { uid: 'target-1' }, auth: { uid: 'caller-1' } })
    ).rejects.toMatchObject({ code: 'permission-denied' });
  });

  it('rechaza si falta el uid objetivo en los datos', async () => {
    userDocs['caller-1'] = { role: 'admin' };

    await expect(callRun({ data: {}, auth: { uid: 'caller-1' } })).rejects.toMatchObject({
      code: 'invalid-argument',
    });
  });

  it('rechaza si un admin (no superadmin) intenta forzar logout de un superadmin', async () => {
    userDocs['caller-1'] = { role: 'admin' };
    userDocs['target-1'] = { role: 'superadmin' };

    await expect(
      callRun({ data: { uid: 'target-1' }, auth: { uid: 'caller-1' } })
    ).rejects.toMatchObject({ code: 'permission-denied' });
  });

  it('permite que un superadmin fuerce logout de otro superadmin', async () => {
    userDocs['caller-1'] = { role: 'superadmin' };
    userDocs['target-1'] = { role: 'superadmin' };

    const result = await callRun({ data: { uid: 'target-1' }, auth: { uid: 'caller-1' } });

    expect(result).toEqual({ success: true, message: 'Usuario desconectado exitosamente' });
    expect(revokeRefreshTokensMock).toHaveBeenCalledWith('target-1');
    expect(updateMock).toHaveBeenCalledWith('target-1', {
      activeSessionsCount: 0,
      hasActiveSession: false,
      sessions: {},
    });
  });

  it('caso feliz: admin fuerza logout de un usuario no-superadmin', async () => {
    userDocs['caller-1'] = { role: 'admin' };
    userDocs['target-1'] = { role: 'receptionist' };

    const result = await callRun({ data: { uid: 'target-1' }, auth: { uid: 'caller-1' } });

    expect(result.success).toBe(true);
    expect(revokeRefreshTokensMock).toHaveBeenCalledWith('target-1');
  });
});
