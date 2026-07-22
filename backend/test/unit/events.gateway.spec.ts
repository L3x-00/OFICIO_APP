/**
 * UNIT — EventsGateway.
 * Lo crítico: el DISCRIMINADOR de persistencia de emitNotification (bug real de
 * prod — [[reference_admin_notification_discriminator]]): persiste SOLO las
 * notifs dirigidas a un userId y que NINGÚN servicio ya persiste (_skipPersist),
 * con providerId=null; el resto solo se emite. Y el handshake WS valida el JWT
 * antes de aceptar el socket (seguridad).
 */
import { EventsGateway } from '../../src/events/events.gateway.js';
import { createPrismaMock, type PrismaMock } from '../mocks/prisma.mock';
import { createConfigMock } from '../mocks/config.mock';

describe('EventsGateway (unit)', () => {
  let prisma: PrismaMock;
  let jwt: { verify: jest.Mock };
  let gateway: EventsGateway;
  let roomEmit: jest.Mock;
  let to: jest.Mock;
  let broadcast: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = createPrismaMock();
    jwt = { verify: jest.fn() };
    gateway = new EventsGateway(
      jwt as any,
      createConfigMock() as any,
      prisma as any,
    );
    roomEmit = jest.fn();
    to = jest.fn(() => ({ emit: roomEmit }));
    broadcast = jest.fn();
    gateway.server = { to, emit: broadcast } as any;
  });

  describe('emitNotification() — discriminador de persistencia', () => {
    it('targetUserId + tipo NO-skip → persiste (providerId null) y emite a su sala', () => {
      gateway.emitNotification({
        type: 'COIN_REWARD',
        title: 't',
        body: 'b',
        targetUserId: 7,
      });
      expect(prisma.adminNotification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            providerId: null,
            targetUserId: 7,
            type: 'COIN_REWARD',
          }),
        }),
      );
      expect(to).toHaveBeenCalledWith('user_7');
      expect(roomEmit).toHaveBeenCalledWith(
        'notification',
        expect.objectContaining({ type: 'COIN_REWARD' }),
      );
      expect(broadcast).not.toHaveBeenCalled();
    });

    it('targetUserId + tipo en _skipPersist (PLAN_APROBADO) → NO persiste, sí emite', () => {
      gateway.emitNotification({
        type: 'PLAN_APROBADO',
        title: 't',
        body: 'b',
        targetUserId: 7,
      });
      expect(prisma.adminNotification.create).not.toHaveBeenCalled();
      expect(to).toHaveBeenCalledWith('user_7');
      expect(roomEmit).toHaveBeenCalled();
    });

    it('targetRole ADMIN (sin targetUserId) → emite a sala admin, NO persiste', () => {
      gateway.emitNotification({
        type: 'NEW_YAPE_PAYMENT',
        title: 't',
        body: 'b',
        targetRole: 'ADMIN',
      });
      expect(prisma.adminNotification.create).not.toHaveBeenCalled();
      expect(to).toHaveBeenCalledWith('admin');
      expect(broadcast).not.toHaveBeenCalled();
    });

    it('sin target → broadcast, NO persiste', () => {
      gateway.emitNotification({ type: 'X', title: 't', body: 'b' });
      expect(prisma.adminNotification.create).not.toHaveBeenCalled();
      expect(broadcast).toHaveBeenCalledWith(
        'notification',
        expect.objectContaining({ type: 'X' }),
      );
    });

    it('si la persistencia falla, igual emite en vivo (no rompe)', () => {
      prisma.adminNotification.create.mockRejectedValue(new Error('db down'));
      expect(() =>
        gateway.emitNotification({
          type: 'COIN_REWARD',
          title: 't',
          body: 'b',
          targetUserId: 7,
        }),
      ).not.toThrow();
      expect(roomEmit).toHaveBeenCalled();
    });
  });

  describe('handleConnection() — handshake JWT', () => {
    const mkClient = (overrides: any = {}) => ({
      id: 'sock-1',
      handshake: { auth: {}, headers: {}, ...overrides.handshake },
      data: {},
      join: jest.fn(),
      disconnect: jest.fn(),
      ...overrides,
    });

    it('sin token → disconnect, no une a ninguna sala', async () => {
      const client = mkClient();
      await gateway.handleConnection(client as any);
      expect(client.disconnect).toHaveBeenCalledWith(true);
      expect(client.join).not.toHaveBeenCalled();
    });

    it('payload incompleto (sin role) → disconnect', async () => {
      jwt.verify.mockReturnValue({ sub: 7, email: 'a@b.com' });
      const client = mkClient({
        handshake: { auth: { token: 'tok' }, headers: {} },
      });
      await gateway.handleConnection(client as any);
      expect(client.disconnect).toHaveBeenCalledWith(true);
    });

    it('token válido USUARIO → une a su sala personal (no a admin)', async () => {
      jwt.verify.mockReturnValue({ sub: 7, email: 'a@b.com', role: 'USUARIO' });
      prisma.user.findUnique.mockResolvedValue({
        id: 7,
        email: 'a@b.com',
        role: 'USUARIO',
        isActive: true,
        deletedAt: null,
      });
      const client = mkClient({
        handshake: { auth: { token: 'Bearer tok' }, headers: {} },
      });
      await gateway.handleConnection(client as any);
      expect(client.join).toHaveBeenCalledWith('user_7');
      expect(client.join).not.toHaveBeenCalledWith('admin');
      expect(client.disconnect).not.toHaveBeenCalled();
    });

    it('token válido ADMIN → une a su sala + sala admin', async () => {
      jwt.verify.mockReturnValue({ sub: 1, email: 'a@b.com', role: 'ADMIN' });
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'a@b.com',
        role: 'ADMIN',
        isActive: true,
        deletedAt: null,
      });
      const client = mkClient({
        handshake: { auth: { token: 'tok' }, headers: {} },
      });
      await gateway.handleConnection(client as any);
      expect(client.join).toHaveBeenCalledWith('user_1');
      expect(client.join).toHaveBeenCalledWith('admin');
    });

    it('usuario suspendido en BD → disconnect aunque el JWT siga vigente', async () => {
      jwt.verify.mockReturnValue({ sub: 7, email: 'a@b.com', role: 'USUARIO' });
      prisma.user.findUnique.mockResolvedValue({
        id: 7,
        email: 'a@b.com',
        role: 'USUARIO',
        isActive: false,
        deletedAt: null,
      });
      const client = mkClient({
        handshake: { auth: { token: 'tok' }, headers: {} },
      });

      await gateway.handleConnection(client as any);

      expect(client.disconnect).toHaveBeenCalledWith(true);
      expect(client.join).not.toHaveBeenCalled();
    });

    it('usa el rol actual de BD y no privilegios admin antiguos del JWT', async () => {
      jwt.verify.mockReturnValue({ sub: 7, email: 'a@b.com', role: 'ADMIN' });
      prisma.user.findUnique.mockResolvedValue({
        id: 7,
        email: 'a@b.com',
        role: 'USUARIO',
        isActive: true,
        deletedAt: null,
      });
      const client = mkClient({
        handshake: { auth: { token: 'tok' }, headers: {} },
      });

      await gateway.handleConnection(client as any);

      expect(client.join).toHaveBeenCalledWith('user_7');
      expect(client.join).not.toHaveBeenCalledWith('admin');
    });

    it('jwt.verify lanza → disconnect (token inválido)', async () => {
      jwt.verify.mockImplementation(() => {
        throw new Error('invalid');
      });
      const client = mkClient({
        handshake: { auth: { token: 'bad' }, headers: {} },
      });
      await gateway.handleConnection(client as any);
      expect(client.disconnect).toHaveBeenCalledWith(true);
    });
  });

  describe('otras emisiones', () => {
    it('emitAdminEvent → sala admin con event + data + timestamp', () => {
      gateway.emitAdminEvent('NEW_PROVIDER', { providerId: 10 });
      expect(to).toHaveBeenCalledWith('admin');
      expect(roomEmit).toHaveBeenCalledWith(
        'adminEvent',
        expect.objectContaining({
          event: 'NEW_PROVIDER',
          data: { providerId: 10 },
        }),
      );
    });

    it('emitProviderAnalytics → solo a la sala del dueño', () => {
      gateway.emitProviderAnalytics(9, { providerId: 10, eventType: 'view' });
      expect(to).toHaveBeenCalledWith('user_9');
      expect(roomEmit).toHaveBeenCalledWith(
        'providerAnalytics',
        expect.objectContaining({ providerId: 10 }),
      );
    });

    it('emitSubastaNew → solo a la sala de la categoría', () => {
      gateway.emitSubastaNew({ requestId: 1, categoryId: 5 } as any);
      expect(to).toHaveBeenCalledWith('category_5');
    });
  });
});
