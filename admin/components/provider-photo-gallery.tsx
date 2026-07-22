'use client';

import { useRef, useState } from 'react';
import { ExternalLink, Image as ImageIcon, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { uploadProviderImage, type ProviderImage } from '@/lib/api';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

interface Props {
  providerId: number;
  images?: ProviderImage[];
  allowEmptyUpload?: boolean;
  onUploaded?: (image: ProviderImage) => void | Promise<void>;
}

export function ProviderPhotoGallery({
  providerId,
  images,
  allowEmptyUpload = false,
  onUploaded,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [failedUrls, setFailedUrls] = useState<Set<string>>(() => new Set());
  const visibleImages = (images ?? []).filter((image) => Boolean(image.url));

  const handleFile = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Selecciona una imagen JPG, PNG, WEBP o GIF.');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error('La imagen no puede superar 5 MB.');
      return;
    }

    setUploading(true);
    try {
      const image = await uploadProviderImage(providerId, file);
      toast.success('Foto agregada al perfil.');
      await onUploaded?.(image);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'No se pudo subir la foto.',
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
        Fotos del perfil ({visibleImages.length})
      </p>

      {visibleImages.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {visibleImages.map((image, index) => (
            <a
              key={image.id ?? image.url}
              href={image.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative block"
              aria-label={`Abrir foto ${index + 1}`}
            >
              {failedUrls.has(image.url) ? (
                <span className="flex aspect-square items-center justify-center rounded-lg border border-white/10 bg-black/30 text-gray-500">
                  <span className="flex flex-col items-center gap-1 text-xs">
                    <ImageIcon size={18} />
                    No disponible
                  </span>
                </span>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={image.url}
                  alt={`Foto del proveedor ${index + 1}`}
                  className="aspect-square w-full rounded-lg border border-white/10 object-cover transition-colors group-hover:border-white/30"
                  onError={() =>
                    setFailedUrls((current) => {
                      const next = new Set(current);
                      next.add(image.url);
                      return next;
                    })
                  }
                />
              )}
              <ExternalLink
                size={13}
                className="absolute right-2 top-2 text-white drop-shadow"
              />
              {image.isCover && (
                <span className="absolute left-2 top-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-yellow-400">
                  Portada
                </span>
              )}
            </a>
          ))}
        </div>
      ) : (
        <div className="flex min-h-24 items-center justify-between gap-3 rounded-lg border border-dashed border-white/15 bg-black/20 p-3">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <ImageIcon size={18} />
            Sin foto registrada
          </div>
          {allowEmptyUpload && (
            <>
              <input
                ref={inputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.gif,image/*"
                className="hidden"
                aria-label="Seleccionar foto del proveedor"
                onChange={(event) => void handleFile(event.target.files?.[0])}
              />
              <button
                type="button"
                disabled={uploading}
                onClick={() => inputRef.current?.click()}
                className="flex min-h-9 items-center gap-2 rounded-lg border border-blue-500/25 bg-blue-500/15 px-3 text-xs font-bold text-blue-400 transition-colors hover:bg-blue-500/25 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Upload size={14} />
                )}
                Subir foto
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
