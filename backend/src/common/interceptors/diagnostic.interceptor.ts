import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { tap } from 'rxjs/operators';

@Injectable()
export class DiagnosticInterceptor implements NestInterceptor {
  private readonly logger = new Logger('SISTEMA_DIAGNOSTICO');

  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest();
    const { method, url, body } = request;

    return next.handle().pipe(
      tap({
        error: (err) => {
          this.logger.error(`❌ FALLO DETECTADO en ${method} ${url}`);
          this.logger.error(`Dato enviado por el móvil: ${JSON.stringify(body)}`);
          this.logger.error(`Mensaje del error: ${err.message}`);
          // Esto te dirá si el error es de base de datos o lógica
          if (err.stack) this.logger.debug(`Stack: ${err.stack.split('\n')[1]}`);
        },
      }),
    );
  }
}