import { IsIn, IsString } from 'class-validator';

const VALID_REASONS = [
  'SPAM',
  'PRECIO_FALSO',
  'CONTENIDO_INAPROPIADO',
  'OTRO',
] as const;

export class ReportOfferDto {
  @IsString()
  @IsIn(VALID_REASONS)
  reason: string;
}
