import { IsEnum, IsIn } from 'class-validator';

/// Catálogo de planes pagables — el precio y descripción los pone
/// el servidor (ver MercadoPagoService.PLAN_CATALOG). El cliente
/// SOLO elige cuál plan + para cuál perfil. Antes el cliente mandaba
/// `price` directamente — atacante podía pagar PREMIUM por S/ 0.01.
export const PAID_PLANS = ['ESTANDAR', 'PREMIUM'] as const;
export type PaidPlan = typeof PAID_PLANS[number];

export const PROVIDER_TYPES = ['OFICIO', 'NEGOCIO'] as const;
export type ProviderTypeValue = typeof PROVIDER_TYPES[number];

export class CreatePreferenceDto {
  @IsIn(PAID_PLANS, { message: 'Plan inválido (ESTANDAR o PREMIUM)' })
  plan: PaidPlan;

  // Identifica a qué perfil aplicar el plan cuando el user tiene
  // ambos (OFICIO + NEGOCIO). Si solo tiene uno, igual debe enviarlo
  // — el backend valida que coincida con el perfil del user.
  @IsIn(PROVIDER_TYPES, { message: 'providerType inválido (OFICIO o NEGOCIO)' })
  providerType: ProviderTypeValue;
}
