import {
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/** Crea una cita. El userId (cliente) sale del JWT, no del body. */
export class CreateAppointmentDto {
  @IsInt()
  providerId: number;

  /** Fecha y hora de la cita en ISO 8601 (ej. 2026-06-25T08:00:00-05:00). */
  @IsISO8601()
  date: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;
}
