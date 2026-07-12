/**
 * UNIT — ReferralsService.
 *
 * Cubre el sistema de monedas y rewards. Una regresión aquí significa
 * usuarios sin pagar (rewards mal entregados), inflación de monedas o
 * doble-aplicación de código (= farm de coins).
 *
 *   • getMyCode:
 *       – Crea bajo demanda si el usuario no tiene código.
 *       – Idempotente: si ya existe, devuelve el mismo sin crear otro.
 *       – El código generado solo usa el alfabeto restringido
 *         (sin 0/O/1/I) y mide 8 caracteres.
 *
 *   • applyCode:
 *       – 400 si el código es vacío.
 *       – 404 si el código no pertenece a nadie.
 *       – 400 si es tu propio código (auto-aplicación prohibida).
 *       – 409 si ya aplicaste antes (anti farm).
 *       – Crea Referral PENDING + incrementa totalInvites del dueño +
 *         notifica al inviter (REFERRAL_PENDING).
 *
 *   • onProviderApproved:
 *       – No-op si el proveedor no existe.
 *       – No-op si el dueño del proveedor no tiene Referral PENDING.
 *       – En el path feliz: APPROVED + coins 25/5 + successfulInvites +
 *         3 notificaciones (inviter, invited, admin) + 2 push.
 *
 *   • redeem:
 *       – 400 si no se elige plan ni reward.
 *       – 400 si se eligen ambos a la vez.
 *       – 400 si el plan no está en el catálogo.
 *       – 400 si no tiene monedas suficientes.
 *       – Plan: requiere proveedor APROBADO; aplica costo + activa
 *         subscription + crea CoinRedemption COMPLETED.
 *       – Reward: descuenta coins + crea CoinRedemption PENDING
 *         (espera coordinación con el proveedor).
 *       – 400 si la reward existe pero está inactiva.
 */

import { ReferralsService } from '../../src/referrals/referrals.service.js';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { createPrismaMock, PrismaMock } from '../mocks/prisma.mock';
import {
  createEventsGatewayMock,
  EventsGatewayMock,
} from '../mocks/events-gateway.mock';
import { createPushMock, PushMock } from '../mocks/push.mock';
import { providerFixture } from '../fixtures/providers.fixture';

describe('ReferralsService (unit)', () => {
  let service: ReferralsService;
  let prisma: PrismaMock;
  let events: EventsGatewayMock;
  let push: PushMock;

  // Constantes que el código declara hardcoded — duplicarlas aquí
  // protege contra cambios accidentales: si alguien sube
  // INVITER_REWARD_COINS a 100 sin actualizar este test, el test
  // explota y nos pide confirmar la decisión.
  const INVITER_REWARD_COINS = 25;
  const INVITED_WELCOME_COINS = 5;

  const INVITER_ID = 100;
  const INVITED_ID = 200;
  const CODE_VALUE = 'ABCDXYZ2';

  beforeEach(() => {
    prisma = createPrismaMock();
    events = createEventsGatewayMock();
    push = createPushMock();
    service = new ReferralsService(prisma as any, events as any, push as any);
  });

  // ────────────────────────────────────────────────────────────────
  //  getMyCode — generación + idempotencia
  // ────────────────────────────────────────────────────────────────
  describe('getMyCode()', () => {
    it('devuelve el código existente sin crear duplicado (idempotencia)', async () => {
      prisma.referralCode.findUnique.mockResolvedValue({
        id: 1,
        userId: INVITER_ID,
        code: CODE_VALUE,
        totalInvites: 3,
        successfulInvites: 2,
        createdAt: new Date(),
      });

      const result = await service.getMyCode(INVITER_ID);

      expect(result.code).toBe(CODE_VALUE);
      // No se intentó crear porque ya existía.
      expect(prisma.referralCode.create).not.toHaveBeenCalled();
    });

    it('crea un código nuevo bajo demanda si el usuario no tenía', async () => {
      // 1ra llamada en getMyCode → no existe el código del user.
      // 2da llamada dentro de generateUniqueCode → no colisiona con otro.
      prisma.referralCode.findUnique
        .mockResolvedValueOnce(null) // user sin código
        .mockResolvedValueOnce(null); // código generado no colisiona
      prisma.referralCode.create.mockResolvedValue({
        id: 2,
        userId: INVITER_ID,
        code: 'GENERATED',
      });

      const result = await service.getMyCode(INVITER_ID);

      expect(result.code).toBe('GENERATED');
      expect(prisma.referralCode.create).toHaveBeenCalledTimes(1);
      // El código generado se persiste para el user correcto.
      expect(prisma.referralCode.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: INVITER_ID,
            code: expect.any(String),
          }),
        }),
      );
    });

    it('el código generado usa el alfabeto restringido (sin 0/O/1/I) y mide 8 chars', async () => {
      // Forzamos la rama de generación.
      prisma.referralCode.findUnique
        .mockResolvedValueOnce(null) // user sin código
        .mockResolvedValueOnce(null); // candidato no colisiona
      let captured: string | undefined;
      prisma.referralCode.create.mockImplementation(async ({ data }: any) => {
        captured = data.code;
        return { id: 3, ...data };
      });

      await service.getMyCode(INVITER_ID);

      expect(captured).toBeDefined();
      expect(captured!).toHaveLength(8);
      // No debe contener caracteres ambiguos.
      expect(captured!).not.toMatch(/[0O1I]/);
      // Solo debe usar el alfabeto declarado.
      expect(captured!).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/);
    });
  });

  // ────────────────────────────────────────────────────────────────
  //  applyCode — anti-farm + auto-aplicación + duplicados
  // ────────────────────────────────────────────────────────────────
  describe('applyCode()', () => {
    it('lanza BadRequestException si el código es vacío', async () => {
      await expect(service.applyCode(INVITED_ID, '   ')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lanza NotFoundException si el código no existe en BD', async () => {
      prisma.referralCode.findUnique.mockResolvedValue(null);
      await expect(service.applyCode(INVITED_ID, CODE_VALUE)).rejects.toThrow(
        NotFoundException,
      );
    });

    /**
     * Auto-aplicación: si el dueño del código intenta aplicárselo a sí
     * mismo, se rechaza. Sin este guard cualquier usuario generaría un
     * código y se aplicaría a sí mismo para inflar coins eternamente.
     */
    it('PROHIBE la auto-aplicación de tu propio código', async () => {
      prisma.referralCode.findUnique.mockResolvedValue({
        userId: INVITER_ID,
        code: CODE_VALUE,
      });
      await expect(
        service.applyCode(/*mismo userId*/ INVITER_ID, CODE_VALUE),
      ).rejects.toThrow(/tu propio código/i);
    });

    /**
     * Anti-farm: cada usuario tiene UN solo Referral como invitado
     * (unique en invitedUserId). Si YA fue referido por OTRO inviter,
     * aplicar un código DISTINTO se bloquea con 409.
     *
     * (Reaplicar el MISMO código del MISMO inviter SÍ es idempotente —
     * eso se cubre en referrals.flow.spec.ts contra BD real.)
     */
    it('PROHIBE doble aplicación con inviter distinto (409 ConflictException)', async () => {
      prisma.referralCode.findUnique.mockResolvedValue({
        userId: INVITER_ID,
        code: CODE_VALUE,
      });
      // El invitado ya tiene un Referral de OTRO inviter (id 999 ≠ 100).
      prisma.referral.findUnique.mockResolvedValue({
        id: 1,
        inviterId: 999,
        invitedUserId: INVITED_ID,
        status: 'PENDING',
      });
      await expect(service.applyCode(INVITED_ID, CODE_VALUE)).rejects.toThrow(
        ConflictException,
      );
    });

    it('normaliza el código a uppercase trim antes de buscarlo', async () => {
      prisma.referralCode.findUnique.mockResolvedValue(null);
      await expect(
        service.applyCode(INVITED_ID, '  abcdxyz2  '),
      ).rejects.toThrow(NotFoundException);
      // findUnique recibió la versión trimmed + uppercase.
      expect(prisma.referralCode.findUnique).toHaveBeenCalledWith({
        where: { code: 'ABCDXYZ2' },
      });
    });

    it('en el path feliz: crea Referral PENDING + incrementa totalInvites + notifica al inviter', async () => {
      prisma.referralCode.findUnique.mockResolvedValue({
        userId: INVITER_ID,
        code: CODE_VALUE,
      });
      prisma.referral.findUnique.mockResolvedValue(null);
      prisma.referral.create.mockResolvedValue({
        id: 7,
        inviterId: INVITER_ID,
        invitedUserId: INVITED_ID,
        status: 'PENDING',
      });
      prisma.referralCode.update.mockResolvedValue({});

      const result = await service.applyCode(INVITED_ID, CODE_VALUE);

      expect(result).toEqual({ success: true, referralId: 7 });
      // Referral creado en estado PENDING (no se entregan coins todavía).
      expect(prisma.referral.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            inviterId: INVITER_ID,
            invitedUserId: INVITED_ID,
            status: 'PENDING',
          }),
        }),
      );
      // Contador totalInvites += 1 en el código del inviter.
      expect(prisma.referralCode.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: INVITER_ID },
          data: { totalInvites: { increment: 1 } },
        }),
      );
      // Notif REFERRAL_PENDING al inviter.
      expect(events.emitNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'REFERRAL_PENDING',
          targetUserId: INVITER_ID,
        }),
      );
    });
  });

  // ────────────────────────────────────────────────────────────────
  //  onProviderApproved — momento en que se entregan las monedas
  // ────────────────────────────────────────────────────────────────
  describe('onProviderApproved()', () => {
    const PROVIDER_ID = 555;

    // Feature OCULTA (2026-07): onProviderApproved tiene early-return si
    // FEATURE_REFERIDOS !== 'true' (evita regalar monedas de una feature
    // invisible). Estos tests validan el comportamiento CON la feature
    // encendida; el early-return se prueba aparte al final.
    beforeEach(() => {
      process.env.FEATURE_REFERIDOS = 'true';
    });
    afterEach(() => {
      delete process.env.FEATURE_REFERIDOS;
    });

    it('early-return null con FEATURE_REFERIDOS apagado (no toca BD)', async () => {
      delete process.env.FEATURE_REFERIDOS;
      const r = await service.onProviderApproved(PROVIDER_ID);
      expect(r).toBeNull();
      expect(prisma.provider.findUnique).not.toHaveBeenCalled();
    });

    it('no-op (return null) si el proveedor no existe', async () => {
      prisma.provider.findUnique.mockResolvedValue(null);
      const r = await service.onProviderApproved(PROVIDER_ID);
      expect(r).toBeNull();
      expect(prisma.referral.findUnique).not.toHaveBeenCalled();
    });

    it('no-op si el dueño no tiene Referral PENDING', async () => {
      prisma.provider.findUnique.mockResolvedValue({
        id: PROVIDER_ID,
        userId: INVITED_ID,
        businessName: 'Negocio Test',
        type: 'OFICIO',
        user: { firstName: 'Maria', lastName: 'Lopez' },
      });
      prisma.referral.findUnique.mockResolvedValue(null); // no hay referral
      const r = await service.onProviderApproved(PROVIDER_ID);
      expect(r).toBeNull();
      expect(prisma.referral.update).not.toHaveBeenCalled();
    });

    it('no-op si el referral existe pero NO está en PENDING (ya aprobado o rechazado)', async () => {
      prisma.provider.findUnique.mockResolvedValue({
        id: PROVIDER_ID,
        userId: INVITED_ID,
        businessName: 'X',
        type: 'OFICIO',
        user: { firstName: 'X', lastName: 'X' },
      });
      prisma.referral.findUnique.mockResolvedValue({
        id: 1,
        status: 'APPROVED', // ya pasó
        inviterId: INVITER_ID,
        invitedUserId: INVITED_ID,
        inviter: { firstName: 'I', lastName: 'I', email: 'i@i' },
      });
      const r = await service.onProviderApproved(PROVIDER_ID);
      expect(r).toBeNull();
    });

    it('path feliz: APPROVED + coins 25/5 + successfulInvites + 3 notifs + 2 push', async () => {
      const referralId = 7;
      prisma.provider.findUnique.mockResolvedValue({
        id: PROVIDER_ID,
        userId: INVITED_ID,
        businessName: 'Plomería de Ana',
        type: 'OFICIO',
        user: { firstName: 'Ana', lastName: 'Soto' },
      });
      prisma.referral.findUnique.mockResolvedValue({
        id: referralId,
        inviterId: INVITER_ID,
        invitedUserId: INVITED_ID,
        status: 'PENDING',
        inviter: { firstName: 'Carlos', lastName: 'Ramos', email: 'c@r' },
      });
      prisma.referral.update.mockResolvedValue({
        id: referralId,
        status: 'APPROVED',
        coinsAwarded: INVITER_REWARD_COINS,
        invitedCoinsAwarded: INVITED_WELCOME_COINS,
      });
      prisma.user.update.mockResolvedValue({});
      prisma.referralCode.update.mockResolvedValue({});

      const result = await service.onProviderApproved(PROVIDER_ID);

      expect(result?.status).toBe('APPROVED');

      // 1. Referral marcado APPROVED con los montos canónicos y
      //    apuntando al provider recién aprobado.
      expect(prisma.referral.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: referralId },
          data: expect.objectContaining({
            status: 'APPROVED',
            coinsAwarded: INVITER_REWARD_COINS,
            invitedCoinsAwarded: INVITED_WELCOME_COINS,
            invitedProviderId: PROVIDER_ID,
            approvedAt: expect.any(Date),
          }),
        }),
      );

      // 2. Inviter recibe +25 coins.
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: INVITER_ID },
        data: { coins: { increment: INVITER_REWARD_COINS } },
      });

      // 3. Invitado recibe +5 coins.
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: INVITED_ID },
        data: { coins: { increment: INVITED_WELCOME_COINS } },
      });

      // 4. successfulInvites += 1 en el código del inviter.
      expect(prisma.referralCode.update).toHaveBeenCalledWith({
        where: { userId: INVITER_ID },
        data: { successfulInvites: { increment: 1 } },
      });

      // 5. 3 notificaciones in-app (inviter, invited, admin).
      const types = events.emitNotification.mock.calls.map((c) => c[0].type);
      expect(types).toEqual(
        expect.arrayContaining([
          'REFERRAL_APPROVED',
          'REFERRAL_WELCOME',
          'REFERRAL_ADMIN_APPROVED',
        ]),
      );

      // 6. 2 push notifications (inviter + invited).
      expect(push.sendToUser).toHaveBeenCalledTimes(2);
      const pushTargets = push.sendToUser.mock.calls.map((c) => c[0]);
      expect(pushTargets).toEqual(
        expect.arrayContaining([INVITER_ID, INVITED_ID]),
      );
    });
  });

  // ────────────────────────────────────────────────────────────────
  //  redeem — canje de plan / reward
  // ────────────────────────────────────────────────────────────────
  describe('redeem()', () => {
    it('lanza BadRequestException si no se elige ni plan ni reward', async () => {
      await expect(service.redeem(INVITER_ID, {} as any)).rejects.toThrow(
        /elegir/i,
      );
    });

    it('lanza BadRequestException si se eligen ambos (plan + reward) a la vez', async () => {
      await expect(
        service.redeem(INVITER_ID, { plan: 'ESTANDAR', rewardId: 1 }),
      ).rejects.toThrow(/una cosa a la vez/i);
    });

    it('lanza NotFoundException si el usuario no existe', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.redeem(INVITER_ID, { plan: 'ESTANDAR' }),
      ).rejects.toThrow(NotFoundException);
    });

    // ── Canje de plan ─────────────────────────────────────────
    describe('canje de plan', () => {
      it('lanza BadRequestException si el plan no está en el catálogo', async () => {
        prisma.user.findUnique.mockResolvedValue({ coins: 100000 });
        await expect(
          service.redeem(INVITER_ID, { plan: 'INVENTADO' }),
        ).rejects.toThrow(/no canjeable/i);
      });

      it('lanza BadRequestException si no tienes suficientes monedas para ESTANDAR (cuesta 1000)', async () => {
        prisma.user.findUnique.mockResolvedValue({ coins: 500 }); // < 1000
        await expect(
          service.redeem(INVITER_ID, { plan: 'ESTANDAR' }),
        ).rejects.toThrow(/Necesitas 1000/i);
      });

      it('lanza BadRequestException si el user no tiene proveedor APROBADO', async () => {
        prisma.user.findUnique.mockResolvedValue({ coins: 1500 });
        prisma.provider.findFirst.mockResolvedValue(null); // no tiene provider aprobado
        await expect(
          service.redeem(INVITER_ID, { plan: 'ESTANDAR' }),
        ).rejects.toThrow(/proveedores aprobados/i);
      });

      it('path feliz ESTANDAR: descuenta 1000 coins, activa subscription 1 mes, crea redemption COMPLETED', async () => {
        prisma.user.findUnique.mockResolvedValue({ coins: 2000 });
        prisma.provider.findFirst.mockResolvedValue({
          ...providerFixture({ id: 50, userId: INVITER_ID }),
          subscription: null, // sin sub previa
        });
        prisma.user.update.mockResolvedValue({});
        prisma.subscription.create.mockResolvedValue({});
        prisma.coinRedemption.create.mockResolvedValue({
          id: 1,
          userId: INVITER_ID,
          plan: 'ESTANDAR',
          coinsSpent: 1000,
          status: 'COMPLETED',
        });

        const result = await service.redeem(INVITER_ID, { plan: 'ESTANDAR' });

        expect(result).toMatchObject({
          success: true,
          planActivated: 'ESTANDAR',
          months: 1,
        });

        // Descuento de 1000 coins.
        expect(prisma.user.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: INVITER_ID },
            data: { coins: { decrement: 1000 } },
          }),
        );

        // Subscription creada (no había previa) con plan ESTANDAR + ACTIVA.
        expect(prisma.subscription.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              providerId: 50,
              plan: 'ESTANDAR',
              status: 'ACTIVA',
              endDate: expect.any(Date),
            }),
          }),
        );

        // CoinRedemption COMPLETED (canje de plan es instantáneo).
        expect(prisma.coinRedemption.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              userId: INVITER_ID,
              plan: 'ESTANDAR',
              coinsSpent: 1000,
              status: 'COMPLETED',
            }),
          }),
        );

        // Notif PLAN_REDEEMED al user.
        expect(events.emitNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'PLAN_REDEEMED',
            targetUserId: INVITER_ID,
          }),
        );
      });

      it('si ya hay subscription, la UPDATEa (no crea duplicado) — costo PREMIUM=2000', async () => {
        prisma.user.findUnique.mockResolvedValue({ coins: 3000 });
        prisma.provider.findFirst.mockResolvedValue({
          ...providerFixture({ id: 50, userId: INVITER_ID }),
          subscription: { id: 1, plan: 'GRATIS', status: 'GRACIA' },
        });
        prisma.user.update.mockResolvedValue({});
        prisma.subscription.update.mockResolvedValue({});
        prisma.coinRedemption.create.mockResolvedValue({
          id: 2,
          userId: INVITER_ID,
          plan: 'PREMIUM',
          coinsSpent: 2000,
          status: 'COMPLETED',
        });

        const result = await service.redeem(INVITER_ID, { plan: 'PREMIUM' });

        expect(result.planActivated).toBe('PREMIUM');
        expect(result.months).toBe(2); // PREMIUM dura 2 meses
        // update en vez de create (ya había sub).
        expect(prisma.subscription.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { providerId: 50 },
            data: expect.objectContaining({
              plan: 'PREMIUM',
              status: 'ACTIVA',
            }),
          }),
        );
        expect(prisma.subscription.create).not.toHaveBeenCalled();
        // 2000 coins debitados.
        expect(prisma.user.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: { coins: { decrement: 2000 } },
          }),
        );
      });
    });

    // ── Canje de reward ───────────────────────────────────────
    describe('canje de reward', () => {
      it('lanza NotFoundException si la reward no existe', async () => {
        prisma.user.findUnique.mockResolvedValue({ coins: 1000 });
        prisma.referralReward.findUnique.mockResolvedValue(null);
        await expect(
          service.redeem(INVITER_ID, { rewardId: 99 }),
        ).rejects.toThrow(NotFoundException);
      });

      it('lanza BadRequestException si la reward está inactiva', async () => {
        prisma.user.findUnique.mockResolvedValue({ coins: 1000 });
        prisma.referralReward.findUnique.mockResolvedValue({
          id: 1,
          isActive: false,
          coinsCost: 50,
          title: 'X',
          description: 'X',
          provider: { id: 1, businessName: 'X', phone: 'X', whatsapp: null },
        });
        await expect(
          service.redeem(INVITER_ID, { rewardId: 1 }),
        ).rejects.toThrow(/no está disponible/i);
      });

      it('lanza BadRequestException si no tienes suficientes coins para la reward', async () => {
        prisma.user.findUnique.mockResolvedValue({ coins: 10 });
        prisma.referralReward.findUnique.mockResolvedValue({
          id: 1,
          isActive: true,
          coinsCost: 500,
          title: 'Corte',
          description: 'D',
          provider: {
            id: 1,
            businessName: 'Peluquería',
            phone: '999',
            whatsapp: null,
          },
        });
        await expect(
          service.redeem(INVITER_ID, { rewardId: 1 }),
        ).rejects.toThrow(/Necesitas 500/i);
      });

      it('path feliz: descuenta coins y crea CoinRedemption PENDING (a coordinar con provider)', async () => {
        prisma.user.findUnique.mockResolvedValue({ coins: 1000 });
        prisma.referralReward.findUnique.mockResolvedValue({
          id: 1,
          isActive: true,
          coinsCost: 200,
          title: 'Corte de pelo',
          description: 'Corte completo',
          provider: {
            id: 7,
            businessName: 'Peluquería Bella',
            phone: '999',
            whatsapp: '999',
          },
        });
        prisma.user.update.mockResolvedValue({});
        prisma.coinRedemption.create.mockResolvedValue({
          id: 99,
          userId: INVITER_ID,
          rewardId: 1,
          coinsSpent: 200,
          status: 'PENDING',
        });

        const result = await service.redeem(INVITER_ID, { rewardId: 1 });

        expect(result.success).toBe(true);
        expect(result.reward!.title).toBe('Corte de pelo');

        // Coins descontados.
        expect(prisma.user.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: INVITER_ID },
            data: { coins: { decrement: 200 } },
          }),
        );

        // Redemption PENDING (no COMPLETED — el provider debe coordinar entrega).
        expect(prisma.coinRedemption.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              userId: INVITER_ID,
              rewardId: 1,
              coinsSpent: 200,
              status: 'PENDING',
            }),
          }),
        );

        // Notif al usuario para que sepa contactar al provider.
        expect(events.emitNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'REWARD_REDEEMED',
            targetUserId: INVITER_ID,
          }),
        );
      });
    });
  });
});
