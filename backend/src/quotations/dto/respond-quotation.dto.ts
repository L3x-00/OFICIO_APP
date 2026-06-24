import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/** Respuesta del proveedor a una cotización: texto + precio estimado opcional. */
export class RespondQuotationDto {
  @IsString()
  @MinLength(2)
  @MaxLength(1000)
  response: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedPrice?: number;
}
