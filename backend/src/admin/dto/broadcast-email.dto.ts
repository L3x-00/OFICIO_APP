import {
  IsString,
  IsOptional,
  IsUrl,
  IsIn,
  MinLength,
  MaxLength,
} from 'class-validator';

/** Segmento de destinatarios del correo masivo. */
export type EmailAudience = 'ALL' | 'CLIENTS' | 'PROVIDERS';

/**
 * Payload del correo masivo enviado por el admin (Brevo). A diferencia del
 * broadcast push, esto envía SOLO email (con la plantilla base de Servi) y
 * permite segmentar por audiencia. La imagen es opcional (cabecera del correo).
 */
export class BroadcastEmailDto {
  @IsString()
  @MinLength(2, { message: 'El asunto debe tener al menos 2 caracteres' })
  @MaxLength(150)
  subject: string;

  @IsString()
  @MinLength(2, { message: 'El mensaje debe tener al menos 2 caracteres' })
  @MaxLength(5000)
  message: string;

  @IsOptional()
  @IsIn(['ALL', 'CLIENTS', 'PROVIDERS'])
  audience?: EmailAudience;

  @IsOptional()
  @IsString()
  // No restringimos a HTTPS porque MinIO puede entregar las imágenes
  // por http durante dev. En prod el bucket vive detrás de HTTPS.
  @IsUrl({ require_protocol: true, require_valid_protocol: true })
  @MaxLength(500)
  imageUrl?: string;
}
