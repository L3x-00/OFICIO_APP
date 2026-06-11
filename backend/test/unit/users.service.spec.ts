/**
 * UNIT — UsersService.getPublicProfile.
 *
 * Invariante de SEGURIDAD: el perfil público que ve un proveedor al tocar la
 * foto de un usuario (reseña/chat) expone EXCLUSIVAMENTE:
 *   id, primer nombre, primer apellido, avatar y fecha de registro.
 *
 * Cubre:
 *   • NotFound si el usuario no existe.
 *   • Recorte al PRIMER token de nombre y apellido (no se filtran segundos
 *     nombres / apellidos compuestos).
 *   • La forma exacta del objeto retornado — ningún campo sensible (email,
 *     phone, ubicación) puede colarse aunque Prisma lo trajera.
 *   • El `select` enviado a Prisma pide solo los campos mínimos.
 */

import { UsersService } from '../../src/users/users.service.js';
import { NotFoundException } from '@nestjs/common';
import { createPrismaMock, PrismaMock } from '../mocks/prisma.mock';
import {
  createEventsGatewayMock,
  EventsGatewayMock,
} from '../mocks/events-gateway.mock';

describe('UsersService.getPublicProfile (unit)', () => {
  let service: UsersService;
  let prisma: PrismaMock;
  let events: EventsGatewayMock;

  beforeEach(() => {
    prisma = createPrismaMock();
    events = createEventsGatewayMock();
    service = new UsersService(prisma as any, events as any);
  });

  it('lanza NotFoundException si el usuario no existe', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.getPublicProfile(999)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('expone SOLO id, primer nombre, primer apellido, avatar y createdAt', async () => {
    const createdAt = new Date('2026-01-15T10:00:00Z');
    prisma.user.findUnique.mockResolvedValue({
      id: 7,
      firstName: 'Juan Carlos',
      lastName: 'Pérez Gómez',
      avatarUrl: 'http://img/a.png',
      createdAt,
      // Campos sensibles que NO deben filtrarse aunque el mock los traiga.
      email: 'secreto@mail.com',
      phone: '999999999',
      department: 'Junín',
    } as any);

    const result = await service.getPublicProfile(7);

    expect(result).toEqual({
      id: 7,
      firstName: 'Juan', // primer token
      lastName: 'Pérez', // primer token
      avatarUrl: 'http://img/a.png',
      createdAt,
    });
    expect(Object.keys(result).sort()).toEqual([
      'avatarUrl',
      'createdAt',
      'firstName',
      'id',
      'lastName',
    ]);
    expect(result).not.toHaveProperty('email');
    expect(result).not.toHaveProperty('phone');
    expect(result).not.toHaveProperty('department');
  });

  it('pide a Prisma solo los campos mínimos (select sin email/phone)', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 1,
      firstName: 'Ana',
      lastName: 'Lopez',
      avatarUrl: null,
      createdAt: new Date(),
    } as any);

    await service.getPublicProfile(1);

    const arg = prisma.user.findUnique.mock.calls[0][0] as any;
    expect(arg.where).toEqual({ id: 1 });
    expect(arg.select).toEqual({
      id: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      createdAt: true,
    });
  });

  it('tolera nombres vacíos o nulos sin romper', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 2,
      firstName: '',
      lastName: null,
      avatarUrl: null,
      createdAt: new Date(),
    } as any);

    const r = await service.getPublicProfile(2);
    expect(r.firstName).toBe('');
    expect(r.lastName).toBe('');
    expect(r.avatarUrl).toBeNull();
  });
});
