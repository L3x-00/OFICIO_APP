/**
 * INTEGRATION — Flujo de validación de confianza contra Postgres real.
 *
 * Cubre identidad/reputación: el "badge de Confiable" condiciona cuánto
 * confía un cliente en un proveedor. Estos tests blindan que el badge solo
 * se otorgue tras la revisión del admin y que la cola de pendientes refleje
 * el estado real.
 *
 *   Test 1: el proveedor envía documentos → entra en cola con status PENDING.
 *   Test 2: el admin aprueba → trustStatus APPROVED + badge (isTrusted=true).
 *
 * Se prueba contra el servicio REAL (TrustValidationService) con Prisma real;
 * MinIO/eventos/push están mockeados (no tocan red/almacenamiento). Sin
 * archivos en submit → no se invoca el upload. Datos limpios en
 * before/afterEach vía TRUNCATE ... CASCADE.
 */

import { TrustValidationService } from '../../src/trust-validation/trust-validation.service.js';
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
  // MinIO mockeado — submit sin archivos no lo llama, pero lo inyectamos
  // por si el servicio cambia y empieza a subir algo.
  const minio = {
    uploadFile: jest.fn().mockResolvedValue('https://cdn.test/doc.jpg'),
  };
  const service = new TrustValidationService(
    prisma,
    events as any,
    minio as any,
    push as any,
  );
  return { service, events, push, minio };
}

describe('Trust validation flow (integration)', () => {
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

  it('Test 1: el proveedor envía documentos → solicitud PENDING en la cola del admin', async () => {
    const { service } = build(prisma);
    const user = await createTestUser(prisma, { role: 'PROVEEDOR' });
    // El perfil debe estar APROBADO para poder pedir validación de confianza.
    const provider = await createTestProvider(prisma, user.id, {
      type: 'OFICIO',
      verificationStatus: 'APROBADO',
      isVerified: true,
      isVisible: true,
    });

    const res = await service.submitRequest(
      user.id,
      'OFICIO',
      {
        dniNumber: '12345678',
        dniFirstName: 'Juan',
        dniLastName: 'Pérez',
        dniAddress: 'Av. Test 123',
      },
      {}, // sin archivos → no se invoca MinIO
    );
    expect(res.success).toBe(true);
    expect(res.requestId).toBeGreaterThan(0);

    // El proveedor entra en cola: trustStatus PENDING, todavía SIN badge.
    const prov = await prisma.provider.findUnique({
      where: { id: provider.id },
    });
    expect(prov!.trustStatus).toBe('PENDING');
    expect(prov!.isTrusted).toBe(false);

    // La solicitud existe en estado PENDING.
    const reqRow = await prisma.trustValidationRequest.findUnique({
      where: { id: res.requestId },
    });
    expect(reqRow!.status).toBe('PENDING');
    expect(reqRow!.providerId).toBe(provider.id);

    // Aparece en la cola que ve el admin.
    const queue = await service.listPendingRequests();
    expect(queue.map((q) => q.id)).toContain(res.requestId);
  });

  it('Test 2: el admin aprueba la validación → status APPROVED + badge de confianza', async () => {
    const { service, push } = build(prisma);
    const user = await createTestUser(prisma, { role: 'PROVEEDOR' });
    const provider = await createTestProvider(prisma, user.id, {
      type: 'OFICIO',
      verificationStatus: 'APROBADO',
      isVerified: true,
    });

    const submit = await service.submitRequest(
      user.id,
      'OFICIO',
      { dniNumber: '87654321', dniFirstName: 'Ana', dniLastName: 'Quispe' },
      {},
    );

    const res = await service.approveRequest(submit.requestId);
    expect(res.success).toBe(true);

    // El proveedor obtiene status APPROVED y el badge de confianza.
    const prov = await prisma.provider.findUnique({
      where: { id: provider.id },
    });
    expect(prov!.trustStatus).toBe('APPROVED');
    expect(prov!.isTrusted).toBe(true);

    // La solicitud queda APPROVED y con fecha de revisión.
    const reqRow = await prisma.trustValidationRequest.findUnique({
      where: { id: submit.requestId },
    });
    expect(reqRow!.status).toBe('APPROVED');
    expect(reqRow!.reviewedAt).not.toBeNull();

    // Ya no figura en la cola de pendientes.
    const queue = await service.listPendingRequests();
    expect(queue.map((q) => q.id)).not.toContain(submit.requestId);

    // Se notificó al proveedor (push de "validación aprobada").
    expect(push.sendToUser).toHaveBeenCalledTimes(1);
  });
});
