/**
 * INTEGRATION — Flujo de referidos contra Postgres real.
 *
 * Verifica que los efectos colaterales (incremento de coins en User,
 * estado del Referral, contadores en ReferralCode) realmente persisten
 * en la BD y no son solo invocaciones mockeadas.
 *
 * Cubre:
 *   1. getMyCode crea código bajo demanda + idempotencia.
 *   2. applyCode rechaza auto-aplicación + código inválido + doble.
 *   3. onProviderApproved entrega 25/5 coins reales en BD.
 *   4. Redeem de plan descuenta coins y activa subscription en BD.
 *   5. Redeem de reward descuenta coins y crea CoinRedemption PENDING.
 */

import { ReferralsService } from '../../src/referrals/referrals.service.js';
import {
  getTestPrisma,
  disconnectTestPrisma,
  truncateAll,
  ensureSeedCatalogs,
} from '../utils/db.util';
import { createEventsGatewayMock } from '../mocks/events-gateway.mock';
import { createPushMock } from '../mocks/push.mock';
import { createTestUser, createTestProvider } from '../utils/factories';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service.js';

function build(prisma: PrismaService) {
  const events = createEventsGatewayMock();
  const push = createPushMock();
  const service = new ReferralsService(prisma, events as any, push as any);
  return { service, events, push };
}

describe('Referrals flow (integration)', () => {
  let prisma: PrismaService;
  const originalFeatureReferidos = process.env.FEATURE_REFERIDOS;

  beforeAll(async () => {
    prisma = await getTestPrisma();
  });

  beforeEach(async () => {
    process.env.FEATURE_REFERIDOS = 'true';
    await truncateAll(prisma);
    await ensureSeedCatalogs(prisma);
  });

  afterAll(async () => {
    if (originalFeatureReferidos === undefined) {
      delete process.env.FEATURE_REFERIDOS;
    } else {
      process.env.FEATURE_REFERIDOS = originalFeatureReferidos;
    }
    await disconnectTestPrisma();
  });

  it('getMyCode genera código único bajo demanda y es idempotente en BD', async () => {
    const { service } = build(prisma);
    const inviter = await createTestUser(prisma);

    const first = await service.getMyCode(inviter.id);
    const second = await service.getMyCode(inviter.id);

    expect(first.code).toMatch(/^[A-Z2-9]{8}$/);
    expect(first.code).toBe(second.code);

    // En BD solo hay UNA fila.
    const rows = await prisma.referralCode.findMany({
      where: { userId: inviter.id },
    });
    expect(rows).toHaveLength(1);
  });

  it('rechaza auto-aplicación + código inválido; mismo código es idempotente, distinto se bloquea', async () => {
    const { service } = build(prisma);
    const inviter = await createTestUser(prisma);
    const invited = await createTestUser(prisma, {
      email: `inv-${Date.now()}@x.com`,
    });
    const code = await service.getMyCode(inviter.id);

    // Auto-aplicación rechazada.
    await expect(service.applyCode(inviter.id, code.code)).rejects.toThrow(
      BadRequestException,
    );

    // Código inválido → 404.
    await expect(service.applyCode(invited.id, 'NOEXISTE')).rejects.toThrow(
      NotFoundException,
    );

    // Primera aplicación válida.
    const ok = await service.applyCode(invited.id, code.code);
    expect(ok.success).toBe(true);

    // Re-aplicar el MISMO código → idempotente (no-op exitoso, SIN doble
    // recompensa ni 2ª referral). Re-registro legítimo, no fraude (ver
    // applyCode: existing.inviterId === owner.userId).
    const again = await service.applyCode(invited.id, code.code);
    expect(again.success).toBe(true);
    expect(again.alreadyApplied).toBe(true);
    expect(again.referralId).toBe(ok.referralId);

    // Aplicar un código DISTINTO habiendo aplicado otro → ConflictException
    // (anti-farm).
    const inviter2 = await createTestUser(prisma, {
      email: `inv2-${Date.now()}@x.com`,
    });
    const code2 = await service.getMyCode(inviter2.id);
    await expect(service.applyCode(invited.id, code2.code)).rejects.toThrow(
      ConflictException,
    );

    // Estado final:
    const refs = await prisma.referral.findMany({
      where: { invitedUserId: invited.id },
    });
    expect(refs).toHaveLength(1);
    expect(refs[0].status).toBe('PENDING');
    const codeRow = await prisma.referralCode.findUnique({
      where: { userId: inviter.id },
    });
    expect(codeRow!.totalInvites).toBe(1);
  });

  it('onProviderApproved entrega 25 coins al inviter y 5 al invitado en BD', async () => {
    const { service } = build(prisma);
    const inviter = await createTestUser(prisma);
    const invited = await createTestUser(prisma, {
      email: `inv-${Date.now()}@x.com`,
    });
    const code = await service.getMyCode(inviter.id);
    await service.applyCode(invited.id, code.code);

    // El invitado se registra como proveedor y un admin lo aprueba.
    // Para integration solo necesitamos el provider en BD con APROBADO.
    const provider = await createTestProvider(prisma, invited.id, {
      verificationStatus: 'APROBADO',
      isVisible: true,
      isVerified: true,
      businessName: 'Negocio aprobado del invitado',
    });

    const result = await service.onProviderApproved(provider.id);
    expect(result).not.toBeNull();
    expect(result!.status).toBe('APPROVED');

    // Coins reales en BD.
    const inviterRow = await prisma.user.findUnique({
      where: { id: inviter.id },
    });
    const invitedRow = await prisma.user.findUnique({
      where: { id: invited.id },
    });
    expect(inviterRow!.coins).toBe(25);
    expect(invitedRow!.coins).toBe(5);

    // Contador successfulInvites incrementado.
    const codeRow = await prisma.referralCode.findUnique({
      where: { userId: inviter.id },
    });
    expect(codeRow!.successfulInvites).toBe(1);

    // Referral persistido como APPROVED con providerId asignado.
    const ref = await prisma.referral.findUnique({
      where: { invitedUserId: invited.id },
    });
    expect(ref!.status).toBe('APPROVED');
    expect(ref!.invitedProviderId).toBe(provider.id);
    expect(ref!.coinsAwarded).toBe(25);
    expect(ref!.invitedCoinsAwarded).toBe(5);
  });

  it('onProviderApproved es idempotente: NO duplica coins si se llama 2 veces', async () => {
    const { service } = build(prisma);
    const inviter = await createTestUser(prisma);
    const invited = await createTestUser(prisma, {
      email: `inv2-${Date.now()}@x.com`,
    });
    const code = await service.getMyCode(inviter.id);
    await service.applyCode(invited.id, code.code);

    const provider = await createTestProvider(prisma, invited.id);

    await service.onProviderApproved(provider.id);
    // Segundo llamado: el referral ya está APPROVED, debe ser no-op.
    const secondCall = await service.onProviderApproved(provider.id);
    expect(secondCall).toBeNull();

    const inviterRow = await prisma.user.findUnique({
      where: { id: inviter.id },
    });
    expect(inviterRow!.coins).toBe(25); // NO se duplica
  });

  it('onProviderApproved no acredita monedas con Referidos oculto', async () => {
    process.env.FEATURE_REFERIDOS = 'false';
    const { service } = build(prisma);
    const inviter = await createTestUser(prisma);
    const invited = await createTestUser(prisma, {
      email: `hidden-${Date.now()}@x.com`,
    });
    const code = await service.getMyCode(inviter.id);
    await service.applyCode(invited.id, code.code);
    const provider = await createTestProvider(prisma, invited.id);

    expect(await service.onProviderApproved(provider.id)).toBeNull();

    const [inviterRow, invitedRow, codeRow, referral] = await Promise.all([
      prisma.user.findUnique({ where: { id: inviter.id } }),
      prisma.user.findUnique({ where: { id: invited.id } }),
      prisma.referralCode.findUnique({ where: { userId: inviter.id } }),
      prisma.referral.findUnique({ where: { invitedUserId: invited.id } }),
    ]);
    expect(inviterRow!.coins).toBe(0);
    expect(invitedRow!.coins).toBe(0);
    expect(codeRow!.successfulInvites).toBe(0);
    expect(referral!.status).toBe('PENDING');
  });

  it('redeem de plan PREMIUM descuenta 2000 coins y activa subscription en BD', async () => {
    const { service } = build(prisma);

    // Setup: user con coins suficientes y provider APROBADO.
    const user = await createTestUser(prisma, { coins: 3000 });
    const provider = await createTestProvider(prisma, user.id);

    const result = await service.redeem(user.id, { plan: 'PREMIUM' });
    expect(result.success).toBe(true);
    expect(result.planActivated).toBe('PREMIUM');
    expect(result.months).toBe(2);

    // Coins debitados en BD.
    const userAfter = await prisma.user.findUnique({ where: { id: user.id } });
    expect(userAfter!.coins).toBe(1000); // 3000 - 2000

    // Subscription persistida.
    const sub = await prisma.subscription.findUnique({
      where: { providerId: provider.id },
    });
    expect(sub).not.toBeNull();
    expect(sub!.plan).toBe('PREMIUM');
    expect(sub!.status).toBe('ACTIVA');

    // CoinRedemption COMPLETED.
    const redemptions = await prisma.coinRedemption.findMany({
      where: { userId: user.id },
    });
    expect(redemptions).toHaveLength(1);
    expect(redemptions[0].status).toBe('COMPLETED');
    expect(redemptions[0].coinsSpent).toBe(2000);
  });

  it('redeem de reward descuenta coins y crea CoinRedemption en PENDING', async () => {
    const { service } = build(prisma);

    // Provider aprobado ofrece una reward; otro usuario la canjea.
    const ownerUser = await createTestUser(prisma, {
      email: `owner-${Date.now()}@x.com`,
    });
    const owner = await createTestProvider(prisma, ownerUser.id, {
      businessName: 'Peluquería Bella',
    });
    const reward = await prisma.referralReward.create({
      data: {
        providerId: owner.id,
        title: 'Corte de pelo gratis',
        description: 'Corte completo de pelo en local',
        coinsCost: 150,
        isActive: true,
      },
    });

    const redeemer = await createTestUser(prisma, {
      email: `redeem-${Date.now()}@x.com`,
      coins: 500,
    });

    const result = await service.redeem(redeemer.id, { rewardId: reward.id });
    expect(result.success).toBe(true);
    expect(result.reward!.title).toBe('Corte de pelo gratis');

    // Coins debitados (500 - 150).
    const after = await prisma.user.findUnique({ where: { id: redeemer.id } });
    expect(after!.coins).toBe(350);

    // CoinRedemption PENDING (espera coordinación con provider).
    const rows = await prisma.coinRedemption.findMany({
      where: { userId: redeemer.id },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('PENDING');
    expect(rows[0].rewardId).toBe(reward.id);
    expect(rows[0].coinsSpent).toBe(150);
  });

  it('redeem rechaza si las monedas no alcanzan (sin tocar BD)', async () => {
    const { service } = build(prisma);
    const user = await createTestUser(prisma, { coins: 100 });
    await createTestProvider(prisma, user.id);

    const before = await prisma.user.findUnique({ where: { id: user.id } });
    expect(before!.coins).toBe(100);

    await expect(service.redeem(user.id, { plan: 'ESTANDAR' })).rejects.toThrow(
      /Necesitas 1000/i,
    );

    const after = await prisma.user.findUnique({ where: { id: user.id } });
    expect(after!.coins).toBe(100); // sin cambios
    const subs = await prisma.subscription.count();
    expect(subs).toBe(0);
    const reds = await prisma.coinRedemption.count();
    expect(reds).toBe(0);
  });
});
