import type { MinioService } from './minio.service.js';

const SERVICE_IMAGE_FOLDERS = ['providers/gallery'] as const;

type ServiceImageEntry = {
  key: string;
  url: string;
};

function serviceImageEntries(scheduleJson: unknown): ServiceImageEntry[] {
  if (
    !scheduleJson ||
    typeof scheduleJson !== 'object' ||
    Array.isArray(scheduleJson)
  ) {
    return [];
  }

  const services = (scheduleJson as Record<string, unknown>).services;
  if (!Array.isArray(services)) return [];

  return services.flatMap((service, index) => {
    if (!service || typeof service !== 'object' || Array.isArray(service)) {
      return [];
    }
    const row = service as Record<string, unknown>;
    if (typeof row.imageUrl !== 'string' || !row.imageUrl.trim()) return [];

    const identity =
      typeof row.id === 'string' || typeof row.id === 'number'
        ? `id:${String(row.id)}`
        : `index:${index}`;
    return [{ key: identity, url: row.imageUrl }];
  });
}

/**
 * Valida fotos embebidas en `scheduleJson.services`. Una URL historica exacta
 * puede conservarse; una URL nueva debe venir de la galeria administrada.
 */
export function assertManagedServiceImageUrls(
  minio: Pick<MinioService, 'assertManagedImageUrl' | 'isSameImageReference'>,
  nextScheduleJson: unknown,
  currentScheduleJson?: unknown,
): void {
  const currentByKey = new Map(
    serviceImageEntries(currentScheduleJson).map(({ key, url }) => [key, url]),
  );

  for (const { key, url } of serviceImageEntries(nextScheduleJson)) {
    if (minio.isSameImageReference(currentByKey.get(key), url)) continue;
    minio.assertManagedImageUrl(url, SERVICE_IMAGE_FOLDERS);
  }
}
