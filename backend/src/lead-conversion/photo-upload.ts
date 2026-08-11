/**
 * Descarga fotos por URL (CDN de Maps) y las sube a R2 vía un `uploader`.
 * Lógica de red compartida entre el CLI `scripts/convert-leads.ts` y el service
 * `lead-conversion.service.ts` — una sola copia para no divergir.
 *
 * No depende de Prisma ni de MinioService: el caller pasa las URLs (que saca del
 * staging por su cuenta) y un `uploader` (típicamente `minio.uploadFile` con la
 * carpeta ya fijada). Best-effort: una foto que falla se omite.
 */
export type PhotoUploader = (
  buffer: Buffer,
  filename: string,
) => Promise<string>;

export interface DownloadUploadOptions {
  /** Máximo de fotos a subir (portada primero). Default 5. */
  limit?: number;
  /** Timeout de descarga por foto (ms). Default 15 s. */
  timeoutMs?: number;
  /** Callback por foto fallida (no aborta el resto). */
  onError?: (url: string, error: unknown) => void;
}

export async function downloadAndUploadPhotos(
  urls: string[],
  uploader: PhotoUploader,
  opts: DownloadUploadOptions = {},
): Promise<string[]> {
  const { limit = 5, timeoutMs = 15_000, onError } = opts;
  const out: string[] = [];
  for (const url of urls.slice(0, limit)) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (ServiLeads)' },
      });
      clearTimeout(timer);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const buffer = Buffer.from(await response.arrayBuffer());
      out.push(await uploader(buffer, 'lead-photo.jpg'));
    } catch (error) {
      onError?.(url, error);
    }
  }
  return out;
}
