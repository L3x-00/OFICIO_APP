/**
 * Fixtures de proveedores. El schema real tiene MUCHOS campos — aquí
 * incluimos los que los tests inspeccionan / pasan a Prisma. Los
 * servicios usan `select` puntuales, así que faltantes de subscription
 * o relaciones se rellenan a demanda en cada test.
 */

export type FixtureProvider = {
  id: number;
  userId: number;
  type: 'OFICIO' | 'NEGOCIO';
  businessName: string;
  phone: string;
  whatsapp: string | null;
  verificationStatus: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
  isVerified: boolean;
  isVisible: boolean;
  isTrusted: boolean;
  averageRating: number;
  totalReviews: number;
  trustStatus: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  hasDelivery: boolean;
  hasHomeService: boolean;
  plenaCoordinacion: boolean;
  description: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  localityId: number;
  dni: string | null;
  ruc: string | null;
  nombreComercial: string | null;
  razonSocial: string | null;
  planPriority: number;
  createdAt: Date;
  updatedAt: Date;
};

export const providerFixture = (
  overrides: Partial<FixtureProvider> = {},
): FixtureProvider => ({
  id: 10,
  userId: 1,
  type: 'OFICIO',
  businessName: 'Electricidad Pérez',
  phone: '999999999',
  whatsapp: '999999999',
  verificationStatus: 'APROBADO',
  isVerified: true,
  isVisible: true,
  isTrusted: false,
  averageRating: 4.5,
  totalReviews: 12,
  trustStatus: 'NONE',
  hasDelivery: false,
  hasHomeService: true,
  plenaCoordinacion: false,
  description: 'Servicio eléctrico profesional 24/7',
  address: 'Av. Test 123',
  latitude: -12.0464,
  longitude: -77.0428,
  localityId: 1,
  dni: '12345678',
  ruc: null,
  nombreComercial: null,
  razonSocial: null,
  planPriority: 4,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
});

/** Proveedor pendiente — recién registrado, sin aprobar. */
export const pendingProviderFixture = (
  overrides: Partial<FixtureProvider> = {},
): FixtureProvider =>
  providerFixture({
    verificationStatus: 'PENDIENTE',
    isVerified: false,
    isVisible: false,
    averageRating: 0,
    totalReviews: 0,
    ...overrides,
  });

/** Proveedor rechazado. */
export const rejectedProviderFixture = (
  overrides: Partial<FixtureProvider> = {},
): FixtureProvider =>
  providerFixture({
    verificationStatus: 'RECHAZADO',
    isVerified: false,
    isVisible: false,
    ...overrides,
  });
