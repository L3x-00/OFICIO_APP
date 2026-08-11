import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { MinioService } from '../common/minio.service.js';
import { convertLead, type StagingLead } from './lead-conversion.core.js';
import { downloadAndUploadPhotos } from './photo-upload.js';

/** Tope de leads por request de conversión (evita transacción/timeout gigante). */
const MAX_CONVERT_BATCH = 50;

export interface ListLeadsParams {
  consent?: string;
  district?: string;
  /** 'yes' = ya convertidos · 'no' = sin convertir · undefined = todos. */
  converted?: string;
  page?: number;
  pageSize?: number;
}

type LeadListRow = {
  leadKey: string;
  businessName: string;
  district: string;
  province: string;
  consentStatus: string;
  status: string;
  convertedProviderId: number | null;
  categoryName: string | null;
  photoCount: number;
};

/**
 * Capa admin sobre la conversión de leads NEGOCIO (Paso 6). Lee el staging
 * (`provider_leads`, que NO es modelo Prisma → SQL crudo) y reusa el core
 * `convertLead` para crear el `User`+`Provider` real. Expuesto solo por el
 * controller admin-guarded.
 */
@Injectable()
export class LeadConversionService {
  private readonly logger = new Logger(LeadConversionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
  ) {}

  private async stats(): Promise<{
    total: number;
    consented: number;
    converted: number;
  }> {
    const rows = await this.prisma.$queryRawUnsafe<
      { total: number; consented: number; converted: number }[]
    >(
      `SELECT count(*)::int AS total,
              count(*) FILTER (WHERE "consentStatus" = 'CONSENTED' AND "convertedProviderId" IS NULL)::int AS consented,
              count(*) FILTER (WHERE "convertedProviderId" IS NOT NULL)::int AS converted
       FROM "provider_leads"`,
    );
    return rows[0] ?? { total: 0, consented: 0, converted: 0 };
  }

  async listLeads(params: ListLeadsParams) {
    const where: string[] = [];
    const values: unknown[] = [];
    if (params.consent) {
      values.push(params.consent);
      where.push(`pl."consentStatus" = $${values.length}`);
    }
    if (params.district) {
      values.push(params.district);
      where.push(`pl."district" = $${values.length}`);
    }
    if (params.converted === 'yes')
      where.push(`pl."convertedProviderId" IS NOT NULL`);
    else if (params.converted === 'no')
      where.push(`pl."convertedProviderId" IS NULL`);
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const pageSize = Math.min(Math.max(1, Number(params.pageSize) || 25), 100);
    const page = Math.max(1, Number(params.page) || 1);
    const offset = (page - 1) * pageSize;

    try {
      const items = await this.prisma.$queryRawUnsafe<LeadListRow[]>(
        `SELECT pl."leadKey", pl."businessName", pl."district", pl."province",
                pl."consentStatus", pl."status", pl."convertedProviderId",
                (SELECT c."name" FROM "categories" c WHERE c."id" = pl."mappedCategoryId") AS "categoryName",
                (SELECT count(*)::int FROM "provider_lead_photos" ph WHERE ph."leadId" = pl."id") AS "photoCount"
         FROM "provider_leads" pl
         ${whereSql}
         ORDER BY pl."createdAt" DESC
         LIMIT ${pageSize} OFFSET ${offset}`,
        ...values,
      );
      const totalRows = await this.prisma.$queryRawUnsafe<{ total: number }[]>(
        `SELECT count(*)::int AS total FROM "provider_leads" pl ${whereSql}`,
        ...values,
      );
      const total = totalRows[0]?.total ?? 0;
      return {
        items,
        total,
        page,
        pageSize,
        pages: Math.max(1, Math.ceil(total / pageSize)),
        stats: await this.stats(),
        stagingMissing: false,
      };
    } catch (error) {
      // Tablas de staging no aplicadas todavía → UI muestra hint, no 500.
      if (
        /relation ".*" does not exist/i.test((error as Error)?.message ?? '')
      ) {
        return {
          items: [],
          total: 0,
          page: 1,
          pageSize,
          pages: 1,
          stats: null,
          stagingMissing: true,
        };
      }
      throw error;
    }
  }

  async convert(leadKeys: string[], approve: boolean) {
    if (!Array.isArray(leadKeys) || leadKeys.length === 0) {
      throw new BadRequestException('Selecciona al menos un lead');
    }
    if (leadKeys.length > MAX_CONVERT_BATCH) {
      throw new BadRequestException(
        `Máximo ${MAX_CONVERT_BATCH} leads por conversión`,
      );
    }

    const results: Array<{
      leadKey: string;
      ok: boolean;
      businessName?: string;
      providerId?: number;
      approved?: boolean;
      reused?: boolean;
      images?: number;
      error?: string;
    }> = [];

    for (const leadKey of leadKeys) {
      try {
        const rows = await this.prisma.$queryRawUnsafe<
          (StagingLead & { id: bigint })[]
        >(
          `SELECT pl."id", pl."leadKey", pl."businessName", pl."publicPhone", pl."whatsapp",
                  pl."ruc", pl."address", pl."department", pl."province", pl."district",
                  pl."mappedCategoryId", pl."categoryIds", pl."scheduleJson", pl."introduction",
                  pl."storeDelivery", pl."website", pl."instagram", pl."facebook", pl."tiktok",
                  pl."linkedin", pl."twitterX", pl."telegram", pl."consentStatus",
                  pl."convertedProviderId", pl."suggestedEmail", pl."suggestedPassword"
           FROM "provider_leads" pl WHERE pl."leadKey" = $1`,
          leadKey,
        );
        const lead = rows[0];
        if (!lead) {
          results.push({
            leadKey,
            ok: false,
            error: 'Lead no encontrado en staging',
          });
          continue;
        }

        // Fotos → R2 (best-effort). El core solo crea las filas ProviderImage.
        const photoRows = await this.prisma.$queryRawUnsafe<{ url: string }[]>(
          `SELECT ph."url" FROM "provider_lead_photos" ph WHERE ph."leadId" = $1 ORDER BY ph."position" ASC`,
          lead.id,
        );
        const imageUrls = await downloadAndUploadPhotos(
          photoRows.map((r) => r.url),
          (buffer, filename) =>
            this.minio.uploadFile(buffer, filename, 'providers/gallery'),
          {
            onError: (url, err) =>
              this.logger.warn(
                `Foto omitida (${url}): ${(err as Error)?.message ?? err}`,
              ),
          },
        );

        const res = await convertLead(this.prisma, lead, {
          approve,
          imageUrls,
        });
        await this.prisma.$executeRawUnsafe(
          `UPDATE "provider_leads" SET "status" = 'CONVERTED', "convertedProviderId" = $1, "updatedAt" = now() WHERE "leadKey" = $2`,
          res.providerId,
          leadKey,
        );
        results.push({
          leadKey,
          ok: true,
          businessName: lead.businessName,
          providerId: res.providerId,
          approved: res.approved,
          reused: res.reused,
          images: res.images,
        });
      } catch (error) {
        results.push({
          leadKey,
          ok: false,
          error: (error as Error)?.message ?? String(error),
        });
      }
    }

    const converted = results.filter((r) => r.ok && !r.reused).length;
    const failed = results.filter((r) => !r.ok).length;
    return { results, converted, failed, stats: await this.stats() };
  }
}
