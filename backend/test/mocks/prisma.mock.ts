/**
 * Mock factory for PrismaService used in UNIT tests.
 *
 * Construye un objeto con todas las tablas + métodos delegados que
 * cualquier servicio del backend pueda invocar, todos como `jest.fn()`
 * sin implementación por defecto. Cada test configura el comportamiento
 * que necesita con `mockResolvedValue` / `mockImplementation`.
 *
 * Diseño:
 *   - `$transaction(callback)` ejecuta el callback con el mismo mock
 *     (simula que `tx` expone los mismos delegados). Para arrays de
 *     promesas, hace `Promise.all`.
 *   - `$queryRaw` / `$executeRaw` son mocks raw para los servicios que
 *     usan SQL crudo (ej. _incrementNoPick en subastas, monthly stats
 *     en referrals).
 *
 * NO usa `jest-mock-extended` para evitar agregar una dependencia más.
 */

export type PrismaMock = {
  user: ReturnType<typeof modelMock>;
  provider: ReturnType<typeof modelMock>;
  providerImage: ReturnType<typeof modelMock>;
  providerCategory: ReturnType<typeof modelMock>;
  providerAnalytic: ReturnType<typeof modelMock>;
  review: ReturnType<typeof modelMock>;
  reviewReply: ReturnType<typeof modelMock>;
  favorite: ReturnType<typeof modelMock>;
  planRequest: ReturnType<typeof modelMock>;
  userReport: ReturnType<typeof modelMock>;
  category: ReturnType<typeof modelMock>;
  appointment: ReturnType<typeof modelMock>;
  menuItem: ReturnType<typeof modelMock>;
  catalogProduct: ReturnType<typeof modelMock>;
  quotationRequest: ReturnType<typeof modelMock>;
  locality: ReturnType<typeof modelMock>;
  referralCode: ReturnType<typeof modelMock>;
  referral: ReturnType<typeof modelMock>;
  referralReward: ReturnType<typeof modelMock>;
  coinRedemption: ReturnType<typeof modelMock>;
  serviceRequest: ReturnType<typeof modelMock>;
  offer: ReturnType<typeof modelMock>;
  offerPost: ReturnType<typeof modelMock>;
  offerReport: ReturnType<typeof modelMock>;
  userPenalty: ReturnType<typeof modelMock>;
  adminNotification: ReturnType<typeof modelMock>;
  chatRoom: ReturnType<typeof modelMock>;
  chatMessage: ReturnType<typeof modelMock>;
  refreshToken: ReturnType<typeof modelMock>;
  otpCode: ReturnType<typeof modelMock>;
  subscription: ReturnType<typeof modelMock>;
  payment: ReturnType<typeof modelMock>;
  yapePayment: ReturnType<typeof modelMock>;
  trustValidationRequest: ReturnType<typeof modelMock>;
  $transaction: jest.Mock;
  $queryRaw: jest.Mock;
  $executeRaw: jest.Mock;
  $connect: jest.Mock;
  $disconnect: jest.Mock;
};

/// Métodos de MUTACIÓN: muchos servicios los usan en fire-and-forget
/// (`void prisma.x.create(...).catch(() => {})`). Si el mock devolviera
/// `undefined`, el `.catch()` crashearía el test con "Cannot read properties
/// of undefined (reading 'catch')". Por eso por defecto resuelven a undefined
/// (una Promise) — los tests que necesiten un valor lo sobreescriben con
/// `mockResolvedValue(...)`.
const MUTATION_METHODS = [
  'create',
  'createMany',
  'update',
  'updateMany',
  'upsert',
  'delete',
  'deleteMany',
] as const;

/** Genera un set estándar de métodos delegados de Prisma como `jest.fn`. */
function modelMock() {
  return {
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    findFirst: jest.fn(),
    findFirstOrThrow: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn().mockResolvedValue(undefined),
    createMany: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    updateMany: jest.fn().mockResolvedValue(undefined),
    upsert: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    deleteMany: jest.fn().mockResolvedValue(undefined),
    count: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn(),
  };
}

export function createPrismaMock(): PrismaMock {
  const mock = {
    user: modelMock(),
    provider: modelMock(),
    providerAnalytic: modelMock(),
    review: modelMock(),
    reviewReply: modelMock(),
    favorite: modelMock(),
    planRequest: modelMock(),
    userReport: modelMock(),
    category: modelMock(),
    appointment: modelMock(),
    menuItem: modelMock(),
    catalogProduct: modelMock(),
    quotationRequest: modelMock(),
    locality: modelMock(),
    providerImage: modelMock(),
    providerCategory: modelMock(),
    referralCode: modelMock(),
    referral: modelMock(),
    referralReward: modelMock(),
    coinRedemption: modelMock(),
    serviceRequest: modelMock(),
    offer: modelMock(),
    offerPost: modelMock(),
    offerReport: modelMock(),
    userPenalty: modelMock(),
    adminNotification: modelMock(),
    chatRoom: modelMock(),
    chatMessage: modelMock(),
    refreshToken: modelMock(),
    otpCode: modelMock(),
    subscription: modelMock(),
    payment: modelMock(),
    yapePayment: modelMock(),
    trustValidationRequest: modelMock(),
    $transaction: jest.fn(async (arg: any) => {
      // Soporta los dos shapes:
      //   await prisma.$transaction(async (tx) => { ... })
      //   await prisma.$transaction([prisma.x.update(), prisma.y.update()])
      if (typeof arg === 'function') {
        return arg(mock);
      }
      if (Array.isArray(arg)) {
        return Promise.all(arg);
      }
      return arg;
    }),
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
  } as PrismaMock;
  return mock;
}

/** Resetea todos los jest.fn() del mock — usar entre tests. */
export function resetPrismaMock(prisma: PrismaMock) {
  for (const key of Object.keys(prisma) as (keyof PrismaMock)[]) {
    const val = (prisma as any)[key];
    if (val && typeof val === 'object') {
      for (const [fnName, fn] of Object.entries(val)) {
        if (typeof fn === 'function' && 'mockReset' in fn) {
          (fn as jest.Mock).mockReset();
          // Restaurar el default resuelto de las mutaciones — sin esto, tras
          // `mockReset` volverían a devolver undefined y los fire-and-forget
          // `.catch()` crashearían.
          if ((MUTATION_METHODS as readonly string[]).includes(fnName)) {
            (fn as jest.Mock).mockResolvedValue(undefined);
          }
        }
      }
    } else if (typeof val === 'function' && 'mockReset' in val) {
      (val as jest.Mock).mockReset();
    }
  }
  // Restablecer comportamiento por defecto de $transaction.
  prisma.$transaction.mockImplementation(async (arg: any) => {
    if (typeof arg === 'function') return arg(prisma);
    if (Array.isArray(arg)) return Promise.all(arg);
    return arg;
  });
}
