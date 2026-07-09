import {
  CanActivate,
  Injectable,
  NotFoundException,
  Type,
  mixin,
} from '@nestjs/common';

/**
 * Kill-switch por variable de entorno para ocultar features completas
 * sin borrar código (mismo patrón que ai-feature-flag.service).
 *
 * Uso: `@UseGuards(FeatureFlag('FEATURE_SUBASTAS'))` a nivel de clase.
 * Si la env NO es exactamente 'true', todos los endpoints del controller
 * devuelven 404 — para el cliente la feature no existe.
 *
 * Reactivar = setear la env en Render y reiniciar. Sin deploy.
 *
 * Flags actuales:
 *   FEATURE_SUBASTAS=true  → reactiva /subastas/* (ConfiServ)
 *   FEATURE_OFERTAS=true   → reactiva /offers y /providers/me/offers
 * (los controllers /admin/offers y /admin/offer-reports NO se flaguean:
 *  el admin conserva historial y moderación.)
 */
export function FeatureFlag(envKey: string): Type<CanActivate> {
  @Injectable()
  class FeatureFlagGuard implements CanActivate {
    canActivate(): boolean {
      if (process.env[envKey] !== 'true') {
        throw new NotFoundException();
      }
      return true;
    }
  }
  return mixin(FeatureFlagGuard);
}
