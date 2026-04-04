import { IsString, IsOptional, IsNumber, IsPositive, IsEnum } from 'class-validator';
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
}
