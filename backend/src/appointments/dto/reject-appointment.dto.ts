import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Motivo opcional al rechazar una cita (lo ve el cliente en la notificación). */
export class RejectAppointmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}
