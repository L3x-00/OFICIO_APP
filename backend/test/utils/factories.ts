/**
 * Factories para INTEGRATION tests.
 *
 * Persisten registros reales en la BD test usando el PrismaService de
 * `db.util.ts`. Los IDs los asigna autoincrement; los specs no deben
 * asumir IDs específicos — usan los devueltos por las factories.
 *
 * Diseño:
 *   - Cada factory acepta overrides parciales con shape exacto de
 *     Prisma (no del fixture mock).
 *   - Email + DNI + códigos referidos llevan sufijos aleatorios para
 *     que tests paralelos / consecutivos no choquen aunque el truncate
 *     entre tests falle parcialmente.
 *   - Hash de password real con bcrypt para que login real funcione.
 */
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service.js';

/** Sufijo aleatorio corto para evitar colisiones de unique. */
function rand(): string {
  return Math.random().toString(36).slice(2, 8);
}

export interface CreatedUser {
  id: number;
  email: string;
  password: string;          // plaintext que usaron los tests para login
  firstName: string;
  lastName: string;
}

/**
 * Crea un usuario en la BD test. Devuelve también el password plaintext
 * que los tests usan para login real. El hash queda persistido.
 */
export async function createTestUser(
  prisma: PrismaService,
  overrides: Partial<{
    email:           string;
    password:        string;
    firstName:       string;
    lastName:        string;
    role:            'USUARIO' | 'PROVEEDOR' | 'ADMIN';
    isActive:        boolean;
    isEmailVerified: boolean;
    firebaseUid:     string | null;
    coins:           number;
    hasUsedTrial:    boolean;
    deletedAt:       Date | null;
  }> = {},
): Promise<CreatedUser> {
  const password = overrides.password ?? 'IntTestPwd!2026';
  const passwordHash = await bcrypt.hash(password, 4); // cost bajo = test rápido
  const u = await prisma.user.create({
    data: {
      email:           overrides.email ?? `it-${rand()}@example.com`,
      passwordHash,
      firstName:       overrides.firstName ?? 'Test',
      lastName:        overrides.lastName  ?? 'User',
      role:            overrides.role ?? 'USUARIO',
      isActive:        overrides.isActive ?? true,
      isEmailVerified: overrides.isEmailVerified ?? true,
      firebaseUid:     overrides.firebaseUid ?? null,
      coins:           overrides.coins ?? 0,
      hasUsedTrial:    overrides.hasUsedTrial ?? false,
      deletedAt:       overrides.deletedAt ?? null,
    },
  });
  return {
    id:        u.id,
    email:     u.email,
    password,
    firstName: u.firstName,
    lastName:  u.lastName,
  };
}

export interface CreatedProvider {
  id: number;
  userId: number;
  type: 'OFICIO' | 'NEGOCIO';
  businessName: string;
  localityId: number;
  categoryId: number;
}

/**
 * Crea un proveedor APROBADO + isVisible en la BD test, listo para que
 * los flows de subastas/chat lo usen como receptor de mensajes/ofertas.
 * El user dueño debe haberse creado antes.
 */
export async function createTestProvider(
  prisma: PrismaService,
  userId: number,
  overrides: Partial<{
    type:               'OFICIO' | 'NEGOCIO';
    businessName:       string;
    verificationStatus: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
    isVisible:          boolean;
    isVerified:         boolean;
    averageRating:      number;
    categoryName:       string;
  }> = {},
): Promise<CreatedProvider> {
  // Localidad mínima (la creamos idempotente en ensureSeedCatalogs).
  const loc = await prisma.locality.upsert({
    where:  { id: 1 },
    create: { id: 1, name: 'Test City', department: 'Lima', province: 'Lima', district: 'Miraflores', isActive: true, source: 'SEED' },
    update: {},
  });

  // Categoría — bien una explícita por nombre, bien la primera hija.
  let categoryId: number;
  if (overrides.categoryName) {
    // Slug determinístico (sin sufijo random) — el upsert es idempotente,
    // dos providers con `categoryName: 'X'` comparten la misma categoría.
    const slug = `test-cat-${overrides.categoryName.toLowerCase().replace(/\s+/g, '-')}`;
    const cat = await prisma.category.upsert({
      where:  { slug },
      create: { name: overrides.categoryName, slug, isActive: true },
      update: {},
    });
    categoryId = cat.id;
  } else {
    // Cualquier categoría existente que tenga padre, o crea una.
    const existing = await prisma.category.findFirst({
      where: { isActive: true, parentId: { not: null } },
    });
    if (existing) {
      categoryId = existing.id;
    } else {
      const root = await prisma.category.create({
        data: { name: 'Servicios', slug: `root-${rand()}`, isActive: true },
      });
      const child = await prisma.category.create({
        data: { name: 'Electricidad', slug: `child-${rand()}`, parentId: root.id, isActive: true },
      });
      categoryId = child.id;
    }
  }

  const p = await prisma.provider.create({
    data: {
      userId,
      type:               overrides.type ?? 'OFICIO',
      businessName:       overrides.businessName ?? `Negocio-${rand()}`,
      phone:              '999999999',
      whatsapp:           '999999999',
      verificationStatus: overrides.verificationStatus ?? 'APROBADO',
      isVerified:         overrides.isVerified ?? true,
      isVisible:          overrides.isVisible ?? true,
      averageRating:      overrides.averageRating ?? 4.5,
      totalReviews:       0,
      localityId:         loc.id,
      providerCategories: {
        create: [{ categoryId, isPrimary: true }],
      },
    },
  });

  return {
    id:           p.id,
    userId:       p.userId,
    type:         p.type as 'OFICIO' | 'NEGOCIO',
    businessName: p.businessName,
    localityId:   loc.id,
    categoryId,
  };
}
