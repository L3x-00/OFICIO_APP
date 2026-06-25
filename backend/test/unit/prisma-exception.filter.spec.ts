/**
 * UNIT — PrismaExceptionFilter.
 * Mapea códigos de error de Prisma a HTTP coherentes para TODA la API. Una
 * regresión aquí convierte un 409/404 limpio en un 500 genérico (o filtra
 * detalles internos de BD al cliente).
 */
import { HttpStatus } from '@nestjs/common';
import { PrismaExceptionFilter } from '../../src/common/filters/prisma-exception.filter.js';

describe('PrismaExceptionFilter (unit)', () => {
  let filter: PrismaExceptionFilter;
  let json: jest.Mock;
  let status: jest.Mock;
  let host: any;

  beforeEach(() => {
    filter = new PrismaExceptionFilter();
    json = jest.fn();
    status = jest.fn(() => ({ json }));
    host = {
      switchToHttp: () => ({ getResponse: () => ({ status }) }),
    };
  });

  const run = (code: string, meta?: any) =>
    filter.catch({ code, meta, message: `Prisma ${code}` } as any, host);

  it('P2002 (único) → 409 con los campos en conflicto', () => {
    run('P2002', { target: ['email', 'phone'] });
    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(json).toHaveBeenCalledWith({
      statusCode: 409,
      message: 'Ya hay un registro con ese email, phone',
    });
  });

  it('P2002 sin meta.target → usa "campo" por defecto', () => {
    run('P2002');
    expect(json).toHaveBeenCalledWith({
      statusCode: 409,
      message: 'Ya hay un registro con ese campo',
    });
  });

  it('P2025 → 404', () => {
    run('P2025');
    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
  });

  it('P2003 → 400 (referencia inválida)', () => {
    run('P2003');
    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
  });

  it('P2014 → 400 (relación inválida)', () => {
    run('P2014');
    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
  });

  it('P2000 → 400 (valor muy largo)', () => {
    run('P2000');
    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
  });

  it('código desconocido → 500 SIN filtrar el mensaje interno de Prisma', () => {
    run('P9999');
    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith({
      statusCode: 500,
      message: 'Error interno de base de datos',
    });
  });
});
