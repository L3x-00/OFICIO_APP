import {
  IsString,
  IsOptional,
  IsIn,
  MinLength,
  MaxLength,
} from 'class-validator';

/**
 * Payload para enviar una notificación a UN proveedor concreto desde el
 * dashboard (drill-down de "Vencen en 7 días" → recordatorio/aviso).
 *
 * `kind` discrimina el tipo de notif persistida/emitida:
 *  - EXPIRY_REMINDER → recordatorio de vencimiento de plan.
 *  - ADMIN_MESSAGE   → mensaje libre del admin (default).
 */
export class NotifyProviderDto {
  @IsString()
  @MinLength(2, { message: 'El título debe tener al menos 2 caracteres' })
  @MaxLength(120)
  title: string;

  @IsString()
  @MinLength(2)
  @MaxLength(500)
  message: string;

  @IsOptional()
  @IsIn(['EXPIRY_REMINDER', 'ADMIN_MESSAGE'])
  kind?: 'EXPIRY_REMINDER' | 'ADMIN_MESSAGE';
}
