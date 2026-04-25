import { Injectable, Logger, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { DecodedIdToken, getAuth } from 'firebase-admin/auth';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private initialized = false;

  onModuleInit() {
    try {
      // Evitar reinicializar si ya hay apps
      if (getApps().length > 0) {
        this.initialized = true;
        this.logger.log('✅ Firebase Admin ya estaba inicializado');
        return;
      }

      // Solo usamos GOOGLE_APPLICATION_CREDENTIALS (archivo de clave)
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        initializeApp({
          credential: cert(process.env.GOOGLE_APPLICATION_CREDENTIALS),
        });
        this.initialized = true;
        this.logger.log('✅ Firebase Admin inicializado correctamente');
      } else {
        this.logger.warn(
          '⚠️ GOOGLE_APPLICATION_CREDENTIALS no está definida. Login social deshabilitado.'
        );
      }
    } catch (error) {
      this.logger.error('Error al inicializar Firebase Admin:', (error as Error).message || error);
      this.logger.warn('⚠️ Login social deshabilitado por error en la inicialización.');
    }
  }

  async verifyIdToken(idToken: string): Promise<DecodedIdToken> {
    if (!this.initialized) {
      throw new UnauthorizedException(
        'Autenticación social no disponible. Contacta al administrador.'
      );
    }
    try {
      const decoded = await getAuth().verifyIdToken(idToken);
      return decoded;
    } catch {
      throw new UnauthorizedException('Token de Firebase inválido o expirado');
    }
  }
}