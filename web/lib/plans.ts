/**
 * Catálogo de planes (display) — espejo de `mobile/.../settings/plan_data.dart`.
 *
 * El PRECIO real lo fija el backend (anti-tampering): MercadoPago usa
 * `PLAN_CATALOG` y Yape el diccionario server-side. Aquí solo se muestran
 * los mismos importes/beneficios que el móvil. GRATIS no requiere pago.
 */
export type PlanId = 'GRATIS' | 'ESTANDAR' | 'PREMIUM';

export interface PlanInfo {
  id: PlanId;
  label: string;
  price: string;
  priceNote: string;
  amount: number; // monto numérico (informativo; el server fija el real)
  features: string[];
  popular?: boolean;
  accent: string; // color tailwind/hex para el acento
}

export const PLANS: PlanInfo[] = [
  {
    id: 'GRATIS',
    label: 'Gratis',
    price: 'S/ 0',
    priceNote: 'Para siempre',
    amount: 0,
    accent: '#6B7280',
    features: [
      'Perfil básico visible',
      'Hasta 2 fotos',
      'Sin estadísticas',
      'Posición estándar en búsqueda',
    ],
  },
  {
    id: 'ESTANDAR',
    label: 'Estándar',
    price: 'S/ 19.90',
    priceNote: 'por mes',
    amount: 19.9,
    popular: true,
    accent: '#3B82F6',
    features: [
      'Badge verificado azul',
      'Hasta 4 fotos',
      'Estadísticas básicas',
      'Mayor visibilidad en búsqueda',
    ],
  },
  {
    id: 'PREMIUM',
    label: 'Premium',
    price: 'S/ 39.90',
    priceNote: 'por mes',
    amount: 39.9,
    accent: '#F59E0B',
    features: [
      'Badge dorado Premium',
      'Fotos ilimitadas',
      'Estadísticas avanzadas',
      'Posición #1 garantizada',
      'Soporte prioritario 24/7',
    ],
  },
];
