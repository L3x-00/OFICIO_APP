import {
  IsString,
  IsOptional,
  IsUrl,
  MinLength,
  MaxLength,
} from 'class-validator';

/**
 * Payload del broadcast masivo. La foto es opcional — si se omite el
 * sistema renderiza una push estándar sin cabecera de imagen.
 */
export class BroadcastNotificationDto {
  @IsString()
  @MinLength(2, { message: 'El título debe tener al menos 2 caracteres' })
  @MaxLength(120)
  title: string;

  @IsString()
  @MinLength(2)
  @MaxLength(500)
  message: string;

  @IsOptional()
  @IsString()
  // No restringimos a HTTPS porque MinIO puede entregar las imágenes
  // por http durante dev. En prod el bucket vive detrás de HTTPS.
  @IsUrl({ require_protocol: true, require_valid_protocol: true })
  @MaxLength(500)
  imageUrl?: string;
}
