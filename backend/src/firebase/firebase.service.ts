import { Injectable, Logger, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { initializeApp, cert, getApps, applicationDefault } from 'firebase-admin/app';
import { DecodedIdToken, getAuth } from 'firebase-admin/auth';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private initialized = false;

  onModuleInit() {
    // Evitar reinicializar si ya hay una app activa (hot-reload, tests)
    if (getApps().length > 0) {
      this.initialized = true;
      this.logger.log('✅ Firebase Admin ya estaba inicializado');
      return;
    }

    try {
      const serviceAccountJson = process.env.SERVICE_ACCOUNT_JSON;

      if (serviceAccountJson) {
        // Render: variable de entorno con el JSON completo en una sola línea
        const serviceAccount = JSON.parse(serviceAccountJson);
        initializeApp({ credential: cert(serviceAccount) });
        this.initialized = true;
        this.logger.log('✅ Firebase Admin inicializado con SERVICE_ACCOUNT_JSON');
        return;
      }

      if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        // Fallback local: ruta al archivo .json de la cuenta de servicio
        initializeApp({ credential: applicationDefault() });
        this.initialized = true;
        this.logger.log('✅ Firebase Admin inicializado con GOOGLE_APPLICATION_CREDENTIALS');
        return;
      }

      this.logger.warn(
        '⚠️ SERVICE_ACCOUNT_JSON y GOOGLE_APPLICATION_CREDENTIALS no están definidas. Login social deshabilitado.',
      );
    } catch (error) {
      this.logger.error('❌ Error al inicializar Firebase Admin:', (error as Error).message ?? error);
      this.logger.warn('⚠️ Login social deshabilitado por error en la inicialización.');
    }
  }

  async verifyIdToken(idToken: string): Promise<DecodedIdToken> {
    if (!this.initialized) {
      throw new UnauthorizedException(
        'Autenticación social no disponible. Configura SERVICE_ACCOUNT_JSON en las variables de entorno.',
      );
    }
    try {
      return await getAuth().verifyIdToken(idToken);
    } catch {
      throw new UnauthorizedException('Token de Firebase inválido o expirado');
    }
  }
}