/**
 * UNIT — ProviderProfileService.
 * Reglas críticas: ownership (siempre por userId del JWT), validación de
 * categorías, normalización de toggles de privacidad, límites de fotos por
 * plan, inbox de notificaciones (solo el dueño marca leídas), degradación de
 * rol al eliminar el último perfil.
 */
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ProviderProfileService } from '../../src/provider-profile/provider-profile.service.js';
import { createPrismaMock, type PrismaMock } from '../mocks/prisma.mock';
import {
  createEventsGatewayMock,
  type EventsGatewayMock,
} from '../mocks/events-gateway.mock';

describe('ProviderProfileService (unit)', () => {
  let prisma: PrismaMock;
  let events: EventsGatewayMock;
  let service: ProviderProfileService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = createPrismaMock();
    events = createEventsGatewayMock();
    service = new ProviderProfileService(prisma as any, events as any);
  });

  describe('getMyProfile()', () => {
    it('sin perfil → NotFound', async () => {
      prisma.provider.findFirst.mockResolvedValue(null);
      await expect(service.getMyProfile(7)).rejects.toThrow(NotFoundException);
    });

    it('aplana _count.favorites → totalFavorites', async () => {
      prisma.provider.findFirst.mockResolvedValue({
        id: 5,
        providerCategories: [],
        _count: { favorites: 3 },
      });
      const res = await service.getMyProfile(7);
      expect(res.totalFavorites).toBe(3);
      expect(res).toHaveProperty('features');
    });
  });

  describe('updateMyProfile()', () => {
    beforeEach(() => {
      prisma.provider.findFirst.mockResolvedValue({ id: 5, type: 'OFICIO' });
    });

    it('categoryIds vacío → BadRequest', async () => {
      await expect(
        service.updateMyProfile(7, { categoryIds: [] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('categoryIds inválidos (<=0) → BadRequest', async () => {
      await expect(
        service.updateMyProfile(7, { categoryIds: [-1] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('alguna categoría no existe/inactiva → BadRequest', async () => {
      prisma.category.findMany.mockResolvedValue([{ id: 1 }]); // falta el 2
      await expect(
        service.updateMyProfile(7, { categoryIds: [1, 2] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('éxito con categorías: reescribe la relación M:N (delete + createMany)', async () => {
      prisma.category.findMany.mockResolvedValue([{ id: 1 }]);
      prisma.provider.update.mockResolvedValue({ id: 5 });
      await service.updateMyProfile(7, { categoryIds: [1] });
      expect(prisma.providerCategory.deleteMany).toHaveBeenCalledWith({
        where: { providerId: 5 },
      });
      expect(prisma.providerCategory.createMany).toHaveBeenCalled();
      expect(prisma.provider.update).toHaveBeenCalled();
    });

    it('normaliza toggles de privacidad string "true" → boolean', async () => {
      prisma.provider.update.mockResolvedValue({ id: 5 });
      await service.updateMyProfile(7, { showPhone: 'true' as any });
      expect(prisma.provider.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ showPhone: true }),
        }),
      );
    });
  });

  describe('setAvailability()', () => {
    it('actualiza y emite cambio de disponibilidad por WS', async () => {
      prisma.provider.findFirst.mockResolvedValue({ id: 5, type: 'OFICIO' });
      prisma.provider.update.mockResolvedValue({
        id: 5,
        availability: 'DISPONIBLE',
      });
      await service.setAvailability(7, 'DISPONIBLE' as any);
      expect(events.emitProviderAvailabilityChanged).toHaveBeenCalledWith({
        providerId: 5,
        availability: 'DISPONIBLE',
      });
    });
  });

  describe('addImage()', () => {
    it('alcanzó el límite del plan GRATIS → BadRequest', async () => {
      prisma.provider.findFirst.mockResolvedValue({ id: 5 });
      prisma.providerImage.count.mockResolvedValue(2); // límite GRATIS = 2
      prisma.subscription.findUnique.mockResolvedValue(null);
      await expect(service.addImage(7, 'https://x.jpg')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('primera imagen sube como portada automáticamente', async () => {
      prisma.provider.findFirst.mockResolvedValue({ id: 5 });
      prisma.providerImage.count.mockResolvedValue(0);
      prisma.subscription.findUnique.mockResolvedValue(null);
      prisma.providerImage.create.mockResolvedValue({ id: 1 });
      await service.addImage(7, 'https://x.jpg');
      expect(prisma.providerImage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isCover: true, order: 0 }),
        }),
      );
    });
  });

  describe('deleteImage()', () => {
    it('imagen inexistente → NotFound', async () => {
      prisma.provider.findFirst.mockResolvedValue({ id: 5 });
      prisma.providerImage.findFirst.mockResolvedValue(null);
      await expect(service.deleteImage(7, 99)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('al borrar la portada, promueve la siguiente imagen', async () => {
      prisma.provider.findFirst.mockResolvedValue({ id: 5 });
      prisma.providerImage.findFirst
        .mockResolvedValueOnce({ id: 9, isCover: true }) // la que se borra
        .mockResolvedValueOnce({ id: 10 }); // la siguiente
      await service.deleteImage(7, 9);
      expect(prisma.providerImage.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { isCover: true },
      });
    });
  });

  describe('requestPlanUpgrade()', () => {
    it('plan inválido → BadRequest', async () => {
      await expect(service.requestPlanUpgrade(7, 'GRATIS')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('ya tiene ese plan → Conflict', async () => {
      prisma.provider.findFirst.mockResolvedValue({ id: 5, type: 'OFICIO' });
      prisma.subscription.findUnique.mockResolvedValue({ plan: 'PREMIUM' });
      await expect(service.requestPlanUpgrade(7, 'PREMIUM')).rejects.toThrow(
        ConflictException,
      );
    });

    it('solicitud pendiente existente → Conflict', async () => {
      prisma.provider.findFirst.mockResolvedValue({ id: 5, type: 'OFICIO' });
      prisma.subscription.findUnique.mockResolvedValue({ plan: 'ESTANDAR' });
      prisma.planRequest.findFirst.mockResolvedValue({ id: 1 });
      await expect(service.requestPlanUpgrade(7, 'PREMIUM')).rejects.toThrow(
        ConflictException,
      );
    });

    it('éxito: crea solicitud, persiste notif y emite a proveedor + admin', async () => {
      prisma.provider.findFirst.mockResolvedValue({ id: 5, type: 'OFICIO' });
      prisma.subscription.findUnique.mockResolvedValue({ plan: 'ESTANDAR' });
      prisma.planRequest.findFirst.mockResolvedValue(null);
      prisma.planRequest.create.mockResolvedValue({
        id: 7,
        provider: { businessName: 'Negocio X' },
      });
      const res = await service.requestPlanUpgrade(7, 'PREMIUM');
      expect(prisma.adminNotification.create).toHaveBeenCalled();
      expect(events.emitNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'NEW_PLAN_REQUEST', targetRole: 'ADMIN' }),
      );
      expect(res).toEqual({ success: true, requestId: 7 });
    });
  });

  describe('markNotificationRead()', () => {
    it('notif ajena / inexistente → BadRequest', async () => {
      prisma.provider.findMany.mockResolvedValue([]);
      prisma.adminNotification.findFirst.mockResolvedValue(null);
      await expect(service.markNotificationRead(7, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('éxito: marca como leída', async () => {
      prisma.provider.findMany.mockResolvedValue([]);
      prisma.adminNotification.findFirst.mockResolvedValue({ id: 1 });
      prisma.adminNotification.update.mockResolvedValue({
        id: 1,
        isRead: true,
      });
      await service.markNotificationRead(7, 1);
      expect(prisma.adminNotification.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isRead: true },
      });
    });
  });

  describe('deleteMyProfile()', () => {
    it('si no quedan perfiles, degrada el rol del usuario a USUARIO', async () => {
      prisma.provider.findFirst.mockResolvedValue({ id: 5, type: 'OFICIO' });
      prisma.provider.count.mockResolvedValue(0);
      await service.deleteMyProfile(7);
      expect(prisma.provider.delete).toHaveBeenCalledWith({ where: { id: 5 } });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 7 },
        data: { role: 'USUARIO' },
      });
      expect(events.emitAdminEvent).toHaveBeenCalledWith(
        'PROVIDER_DELETED',
        expect.objectContaining({ providerId: 5 }),
      );
    });

    it('si aún quedan perfiles, NO degrada el rol', async () => {
      prisma.provider.findFirst.mockResolvedValue({ id: 5, type: 'OFICIO' });
      prisma.provider.count.mockResolvedValue(1);
      await service.deleteMyProfile(7);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });
});
