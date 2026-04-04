import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
// --- CAMBIA ESTA LÍNEA ---
// PONE ESTA LÍNEA, que es la forma correcta y oficial.
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import type { Response } from 'express';

@Catch(PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx      = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    this.logger.error(`Prisma [${exception.code}]: ${exception.message}`);

    const { status, message } = this.mapError(exception);
    response.status(status).json({ statusCode: status, message });
  }

  private mapError(e: PrismaClientKnownRequestError): { status: number; message: string } {
    switch (e.code) {
      case 'P2002': {
        const fields = (e.meta?.target as string[] | undefined)?.join(', ') ?? 'campo';
        return {
          status:  HttpStatus.CONFLICT,
          message: `Ya existe un registro con ese ${fields}`,
        };
      }
      case 'P2025':
        return { status: HttpStatus.NOT_FOUND, message: 'El registro no fue encontrado' };
      case 'P2003':
        return {
          status:  HttpStatus.BAD_REQUEST,
          message: 'Referencia inválida: el registro relacionado no existe',
        };
      case 'P2014':
        return { status: HttpStatus.BAD_REQUEST, message: 'Relación inválida entre registros' };
      case 'P2000':
        return { status: HttpStatus.BAD_REQUEST, message: 'El valor proporcionado es demasiado largo para el campo' };
      default:
        return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Error interno de base de datos' };
    }
  }
}
