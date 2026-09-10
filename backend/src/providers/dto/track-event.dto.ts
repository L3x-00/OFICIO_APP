import {
  IsString,
  IsOptional,
  IsNumber,
  IsPositive,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TrackEventDto {
  @IsEnum(['whatsapp_click', 'call_click', 'view'], {
    message: 'eventType debe ser whatsapp_click, call_click o view',
  })
  eventType: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  userId?: number;

  // Ubicación del cliente (opcional): habilita la métrica de conversión por
  // distancia. Rango válido de coordenadas; el backend calcula la distancia.
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  clientLat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  clientLng?: number;
}
