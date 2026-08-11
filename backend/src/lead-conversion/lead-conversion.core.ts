/**
 * Paso 6 — Conversión de un lead NEGOCIO (staging `provider_leads`) en el
 * `User` + `Provider` reales de Servi.
 *
 * Lógica PURA y testeable: no usa decoradores ni DI de NestJS, recibe `prisma`
 * como parámetro. La corre el CLI local `scripts/convert-leads.ts` (Prisma
 * desnudo) — NUNCA se importa en AppModule, así que no agrega superficie al
 * backend desplegado.
 *
 * Reusa la validación real del registro para no duplicar reglas de negocio:
 *   - validateProviderCategorySelection (categorías por tipo)
 *   - uniqueSlug (vanity URL)
 *   - bcrypt.hash (igual que el backend)
 * El mapeo Provider y la resolución de localidad replican
 * `auth/services/auth-registration.service.ts`; el efecto de `--approve`
 * replica `admin/services/admin-trust.service.ts::approveVerification`.
 */
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import type { PrismaService } from '../../prisma/prisma.service.js';
import { validateProviderCategorySelection } from '../common/provider-category-validation.js';
import { uniqueSlug } from '../common/slug.util.js';

/** Dominio real de los correos de acceso generados para los negocios. */
const ACCESS_EMAIL_DOMAIN = 'oficioapp.org.pe';
/** Alfabeto de la contraseña de acceso: alfanumérico sin caracteres ambiguos
 *  (se quitan O/0/I/l/1 para que el negocio la tipee sin confundirse). */
const ACCESS_ALPHABET =
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

/**
 * Contraseña de acceso inicial: 8 caracteres alfanuméricos, aleatoria. Se
 * muestra UNA sola vez al admin (para dársela al negocio) y se re-hashea con
 * bcrypt; el negocio la cambia al configurar su cuenta.
 * ponytail: sesgo de módulo despreciable (alfabeto ~55) para una contraseña
 * temporal de primer login; no es un secreto maestro.
 */
function generateAccessPassword(): string {
  const bytes = randomBytes(8);
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += ACCESS_ALPHABET[bytes[i] % ACCESS_ALPHABET.length];
  }
  return out;
}

/** Fila de `provider_leads` (solo los campos que consume la conversión). */
export interface StagingLead {
  leadKey: string;
  businessName: string;
  publicPhone: string | null;
  whatsapp: string | null;
  ruc: string | null;
  address: string | null;
  department: string | null;
  province: string | null;
  district: string | null;
  mappedCategoryId: number | null;
  categoryIds: number[] | null;
  scheduleJson: unknown;
  introduction: string | null;
  storeDelivery: boolean | null;
  website: string | null;
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  linkedin: string | null;
  twitterX: string | null;
  telegram: string | null;
  consentStatus: string;
  convertedProviderId: number | null;
  suggestedEmail: string | null;
  suggestedPassword: string | null;
}

export interface ConvertOptions {
  /** Además de crear el Provider, aprobarlo y hacerlo visible (crea Subscription). */
  approve?: boolean;
  /**
   * URLs de imágenes YA subidas a R2 (el CLI descarga las fotos del lead y las
   * sube antes de llamar). La primera queda como portada. El core solo crea las
   * filas ProviderImage — no toca la red (se mantiene puro y testeable).
   */
  imageUrls?: string[];
}

export interface ConvertResult {
  leadKey: string;
  userId: number;
  providerId: number;
  approved: boolean;
  /** Nº de imágenes (ProviderImage) adjuntadas. */
  images: number;
  /** true si el negocio ya existía (idempotencia): no se creó nada nuevo. */
  reused: boolean;
  /** Email de acceso del negocio (`<slug>@oficioapp.org.pe`). Vacío si reused. */
  email: string;
  /** Contraseña en texto plano — SOLO para mostrarla una vez al admin. `null`
   *  cuando reused (no se genera una nueva). NUNCA se persiste sin hashear. */
  password: string | null;
}

// Prioridad de listado por plan/estado. Copia local del canónico
// admin/services/admin-shared.ts::planToPriority (switch puro de 6 líneas): se
// replica para no acoplar esta herramienta local al subsistema admin.
function planToPriority(plan: string, status: string): number {
  if (status !== 'ACTIVA') return 4;
  return plan === 'PREMIUM'
    ? 1
    : plan === 'ESTANDAR'
      ? 2
      : plan === 'GRATIS'
        ? 3
        : 4;
}

/** Normaliza texto para comparar ubicaciones (sin acentos, minúsculas). */
function norm(value?: string | null): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Especialidades del lead con la primaria PRIMERO (validateProviderCategorySelection
 * y el registro toman el índice 0 como fallback de principal).
 */
export function categoryIdsFromLead(lead: StagingLead): number[] {
  const ids = Array.isArray(lead.categoryIds)
    ? lead.categoryIds.filter((n) => Number.isInteger(n) && n > 0)
    : [];
  const primary = lead.mappedCategoryId;
  if (primary && Number.isInteger(primary)) {
    return [primary, ...ids.filter((id) => id !== primary)];
  }
  return ids;
}

/**
 * Resuelve la localidad del lead (dept/prov/dist). Réplica trimmeada del bloque
 * de `auth-registration.service.ts` (registro real): match case/acento-insensible;
 * si la localidad no existe en el catálogo, la crea (source USER) para que el
 * negocio caiga EXACTO en su zona y los filtros lo encuentren. Siempre devuelve
 * un id.
 */
export async function resolveLocality(
  prisma: PrismaService,
  lead: StagingLead,
): Promise<number> {
  if (lead.department && lead.department.trim().length >= 2) {
    const nDept = norm(lead.department);
    const nProv = norm(lead.province);
    const nDist = norm(lead.district);
    const all = await prisma.locality.findMany({
      select: { id: true, department: true, province: true, district: true },
    });
    const found = all.find(
      (l) =>
        norm(l.department) === nDept &&
        norm(l.province) === nProv &&
        norm(l.district) === nDist,
    );
    if (found) return found.id;
    const created = await prisma.locality.create({
      data: {
        name: (lead.district || lead.province || lead.department).trim(),
        department: lead.department.trim(),
        province: lead.province?.trim() || null,
        district: lead.district?.trim() || null,
        isActive: true,
        source: 'USER',
      },
    });
    return created.id;
  }
  const first = await prisma.locality.findFirst({ where: { isActive: true } });
  return first?.id ?? 1;
}

/**
 * Convierte un lead CONSENTED en User + Provider(NEGOCIO). Idempotente por
 * `convertedProviderId`: si el lead ya fue convertido, no crea nada.
 *
 * Genera credenciales de acceso NUEVAS (email `<slug>@oficioapp.org.pe` +
 * contraseña de 8 chars) — no usa las del scraper. La contraseña se devuelve en
 * texto plano para mostrarla UNA vez al admin y se persiste solo hasheada.
 *
 * Crea el Provider en PENDIENTE/invisible (igual que un registro normal). Con
 * `approve:true` además lo aprueba/visibiliza y le crea la Subscription de
 * cortesía, replicando los efectos de BD de la aprobación admin.
 */
export async function convertLead(
  prisma: PrismaService,
  lead: StagingLead,
  opts: ConvertOptions = {},
): Promise<ConvertResult> {
  // 1. Compuerta de consentimiento (nunca se convierte sin CONSENTED).
  if (lead.consentStatus !== 'CONSENTED') {
    throw new Error(
      `Lead ${lead.leadKey}: solo se convierten leads CONSENTED (estado actual: ${lead.consentStatus}).`,
    );
  }

  // 2. Idempotencia por convertedProviderId: si ya se convirtió, no dupliques.
  if (lead.convertedProviderId != null) {
    const existing = await prisma.provider.findUnique({
      where: { id: lead.convertedProviderId },
      select: { id: true, userId: true },
    });
    if (existing) {
      return {
        leadKey: lead.leadKey,
        userId: existing.userId,
        providerId: existing.id,
        approved: false,
        images: 0,
        reused: true,
        email: '',
        password: null,
      };
    }
  }

  // 3. Categorías (reuso de la validación real) — la primaria va primera.
  const orderedIds = categoryIdsFromLead(lead);
  const validCategoryIds = await validateProviderCategorySelection(
    prisma,
    orderedIds,
    'NEGOCIO',
  );
  const primaryCategoryId =
    lead.mappedCategoryId && validCategoryIds.includes(lead.mappedCategoryId)
      ? lead.mappedCategoryId
      : validCategoryIds[0];

  // 4. Credenciales GENERADAS al convertir (no las del scraper): email simple
  //    en el dominio real con sufijo -2/-3 solo si colisiona (User.email único),
  //    y contraseña de 8 chars que se muestra una vez y se re-hashea.
  const emailLocal = await uniqueSlug(lead.businessName, async (candidate) =>
    Boolean(
      await prisma.user.findUnique({
        where: { email: `${candidate}@${ACCESS_EMAIL_DOMAIN}` },
        select: { id: true },
      }),
    ),
  );
  const email = `${emailLocal}@${ACCESS_EMAIL_DOMAIN}`;
  const password = generateAccessPassword();
  const passwordHash = await bcrypt.hash(password, 10);

  // 5. Localidad + slug (fuera de la transacción, como el registro real).
  const localityId = await resolveLocality(prisma, lead);
  const providerSlug = await uniqueSlug(lead.businessName, async (candidate) =>
    Boolean(
      await prisma.provider.findUnique({
        where: { slug: candidate },
        select: { id: true },
      }),
    ),
  );

  // 6. User + Provider (+ aprobación opcional) atómicos.
  const result = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        email,
        passwordHash,
        firstName: lead.businessName.trim().slice(0, 80) || 'Negocio',
        lastName: 'Negocio',
        role: 'USUARIO',
        isEmailVerified: true,
        department: lead.department?.trim() || null,
        province: lead.province?.trim() || null,
        district: lead.district?.trim() || null,
      },
      select: { id: true, hasUsedTrial: true },
    });
    const userId = createdUser.id;
    const usedTrial = createdUser.hasUsedTrial;

    const provider = await tx.provider.create({
      data: {
        userId,
        type: 'NEGOCIO' as any,
        businessName: lead.businessName,
        slug: providerSlug,
        phone: lead.publicPhone?.trim() || '',
        ruc: lead.ruc?.trim() || null,
        hasDelivery: Boolean(lead.storeDelivery),
        whatsapp: lead.whatsapp?.trim() || null,
        description: lead.introduction?.trim() || null,
        address: lead.address?.trim() || null,
        website: lead.website?.trim() || null,
        instagram: lead.instagram?.trim() || null,
        tiktok: lead.tiktok?.trim() || null,
        facebook: lead.facebook?.trim() || null,
        linkedin: lead.linkedin?.trim() || null,
        twitterX: lead.twitterX?.trim() || null,
        telegram: lead.telegram?.trim() || null,
        localityId,
        // Prisma no acepta `null` literal en un campo JSON: si no hay horario,
        // se omite (la columna queda null por defecto).
        ...(lead.scheduleJson
          ? { scheduleJson: lead.scheduleJson as any }
          : {}),
        providerCategories: {
          create: validCategoryIds.map((cid) => ({
            categoryId: cid,
            isPrimary: cid === primaryCategoryId,
          })),
        },
        verificationStatus: 'PENDIENTE',
        isVisible: false,
      },
      select: { id: true },
    });

    // Galería: URLs ya subidas a R2 por el CLI. La primera es la portada.
    const imageUrls = opts.imageUrls ?? [];
    if (imageUrls.length > 0) {
      await tx.providerImage.createMany({
        data: imageUrls.map((url, index) => ({
          providerId: provider.id,
          url,
          isCover: index === 0,
          order: index,
        })),
      });
    }

    let approved = false;
    if (opts.approve) {
      // Réplica de admin-trust.approveVerification (efectos de BD): sin trial
      // previo → ESTANDAR/GRACIA 1 mes; con trial usado → GRATIS/ACTIVA. NO
      // emite notificaciones/FCM (innecesario en una conversión de back-office).
      const trialPlan = usedTrial ? 'GRATIS' : 'ESTANDAR';
      const trialStatus = usedTrial ? 'ACTIVA' : 'GRACIA';
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);

      await tx.provider.update({
        where: { id: provider.id },
        data: {
          isVerified: true,
          verificationStatus: 'APROBADO',
          isVisible: true,
          planPriority: planToPriority(trialPlan, 'ACTIVA'),
        },
      });
      await tx.user.update({
        where: { id: userId },
        data: { role: 'PROVEEDOR' },
      });
      await tx.subscription.create({
        data: {
          providerId: provider.id,
          plan: trialPlan as any,
          status: trialStatus as any,
          endDate,
        },
      });
      approved = true;
    }

    return {
      userId,
      providerId: provider.id,
      approved,
      images: imageUrls.length,
    };
  });

  return {
    leadKey: lead.leadKey,
    userId: result.userId,
    providerId: result.providerId,
    approved: result.approved,
    images: result.images,
    reused: false,
    email,
    password,
  };
}
