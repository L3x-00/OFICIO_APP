/**
 * INTEGRATION — Flujo de pagos (PlanRequest / Yape) contra Postgres real.
 *
 * Cubre dinero: un PlanRequest mal procesado activa (o no) una suscripción
 * de pago. Estos tests blindan ese camino para que un refactor futuro no
 * active planes sin aprobación ni los rechace por error.
 *
 *   Test 1: PlanRequest (Yape) → admin APRUEBA → suscripción ACTIVA al plan.
 *   Test 2: PlanRequest (Yape) → admin RECHAZA → la suscripción NO cambia.
 *
 * Se prueba contra el servicio REAL (AdminPaymentsService) con Prisma real;
 * solo eventos/push están mockeados (no tocan red). Datos limpios en
 * before/afterEach vía TRUNCATE ... CASCADE.
 */

import { AdminPaymentsService } from '../../src/admin/services/admin-payments.service.js';
import {
  getTestPrisma,
  disconnectTestPrisma,
  truncateAll,
  ensureSeedCatalogs,
} from '../utils/db.util';
import { createEventsGatewayMock } from '../mocks/events-gateway.mock';
import { createPushMock } from '../mocks/push.mock';
import { createTestUser, createTestProvider } from '../utils/factories';
import type { PrismaService } from '../../prisma/prisma.service.js';

function build(prisma: PrismaService) {
  const events = createEventsGatewayMock();
  const push = createPushMock();
  const service = new AdminPaymentsService(
    prisma,
    events as any,
    push as any,
  );
  return { service, events, push };
}

describe('Payments flow (integration)', () => {
  let prisma: PrismaService;

  beforeAll(async () => {
    prisma = await getTestPrisma();
  });

  beforeEach(async () => {
    await truncateAll(prisma);
    await ensureSeedCatalogs(prisma);
  });

  afterEach(async () => {
    await truncateAll(prisma);
  });

  afterAll(async () => {
    await disconnectTestPrisma();
  });

  it('Test 1: aprobar PlanRequest activa la suscripción del proveedor (ACTIVA + plan)', async () => {
    const { service, push } = build(prisma);
    const user = await createTestUser(prisma, { role: 'PROVEEDOR' });
    const provider = await createTestProvider(prisma, user.id);

    // El proveedor paga por Yape y crea una solicitud para subir a PREMIUM.
    const planReq = await prisma.planRequest.create({
      data: { providerId: provider.id, plan: 'PREMIUM', status: 'PENDIENTE' },
    });

    // Pre-condición: aún no hay suscripción.
    const before = await prisma.subscription.findUnique({
      where: { providerId: provider.id },
    });
    expect(before).toBeNull();

    const res = await service.approvePlanRequest(planReq.id);
    expect(res.success).toBe(true);

    // La suscripción quedó ACTIVA en el plan solicitado.
    const sub = await prisma.subscription.findUnique({
      where: { providerId: provider.id },
    });
    expect(sub).not.toBeNull();
    expect(sub!.plan).toBe('PREMIUM');
    expect(sub!.status).toBe('ACTIVA');

    // La solicitud quedó marcada como APROBADO.
    const reqAfter = await prisma.planRequest.findUnique({
      where: { id: planReq.id },
    });
    expect(reqAfter!.status).toBe('APROBADO');

    // El proveedor sube en el ranking de listado (PREMIUM activa = prioridad 1).
    const provAfter = await prisma.provider.findUnique({
      where: { id: provider.id },
    });
    expect(provAfter!.planPriority).toBe(1);

    // Se notificó al proveedor (push de "plan aprobado").
    expect(push.sendToUser).toHaveBeenCalledTimes(1);
  });

  it('Test 2: rechazar PlanRequest NO cambia la suscripción existente', async () => {
    const { service } = build(prisma);
    const user = await createTestUser(prisma, { role: 'PROVEEDOR' });
    const provider = await createTestProvider(prisma, user.id);

    // El proveedor ya tiene una suscripción GRATIS/ACTIVA vigente.
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await prisma.subscription.create({
      data: {
        providerId: provider.id,
        plan: 'GRATIS',
        status: 'ACTIVA',
        endDate,
      },
    });

    // Solicita subir a PREMIUM pagando por Yape.
    const planReq = await prisma.planRequest.create({
      data: { providerId: provider.id, plan: 'PREMIUM', status: 'PENDIENTE' },
    });

    const res = await service.rejectPlanRequest(
      planReq.id,
      'Comprobante de Yape ilegible',
    );
    expect(res.success).toBe(true);

    // La solicitud queda RECHAZADO con el motivo persistido.
    const reqAfter = await prisma.planRequest.findUnique({
      where: { id: planReq.id },
    });
    expect(reqAfter!.status).toBe('RECHAZADO');
    expect(reqAfter!.reason).toBe('Comprobante de Yape ilegible');

    // CRÍTICO: la suscripción NO cambió — sigue GRATIS/ACTIVA. Un rechazo
    // jamás debe activar el plan de pago solicitado.
    const sub = await prisma.subscription.findUnique({
      where: { providerId: provider.id },
    });
    expect(sub!.plan).toBe('GRATIS');
    expect(sub!.status).toBe('ACTIVA');
  });

  it('rechaza aprobar una solicitud ya procesada (idempotencia anti doble-cobro)', async () => {
    const { service } = build(prisma);
    const user = await createTestUser(prisma, { role: 'PROVEEDOR' });
    const provider = await createTestProvider(prisma, user.id);
    const planReq = await prisma.planRequest.create({
      data: { providerId: provider.id, plan: 'ESTANDAR', status: 'PENDIENTE' },
    });

    await service.approvePlanRequest(planReq.id);

    // Segundo intento sobre la MISMA solicitud → error, no re-activa nada.
    await expect(service.approvePlanRequest(planReq.id)).rejects.toThrow(
      /ya fue procesada/i,
    );
  });
});
