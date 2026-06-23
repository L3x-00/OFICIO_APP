import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/** Secciones válidas de la carta (set fijo → carta consistente y agrupable). */
export const MENU_SECTIONS = [
  'entrada',
  'fondo',
  'postre',
  'bebida',
  'promocion',
  'otro',
] as const;

export class CreateMenuItemDto {
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
  @IsIn(MENU_SECTIONS)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  photoUrl?: string;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  /** Menú del día — solo plan PREMIUM (validado en el servicio). */
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  order?: number;
}
