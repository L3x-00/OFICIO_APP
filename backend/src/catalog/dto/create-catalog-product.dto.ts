import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCatalogProductDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsNumber()
  @Min(0)
  price: number;

  /** Precio de oferta (opcional) — el público muestra `price` tachado. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  offerPrice?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  /** Sección/categoría de la tienda (texto libre). */
  @IsOptional()
  @IsString()
  @MaxLength(60)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  photoUrl?: string;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  order?: number;
}
