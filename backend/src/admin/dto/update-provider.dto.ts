import {
  IsString,
  IsOptional,
  IsNumber,
  IsPositive,
  IsArray,
  ArrayMaxSize,
  MaxLength,
  IsIn,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateProviderDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  businessName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  whatsapp?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  // Estado de disponibilidad — enum AvailabilityStatus del schema.
  @IsOptional()
  @IsIn(['DISPONIBLE', 'OCUPADO', 'CON_DEMORA'])
  availability?: string;

  // Visibilidad pública del perfil.
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @IsNumber({}, { each: true })
  @IsPositive({ each: true })
  @Type(() => Number)
  categoryIds?: number[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  primaryCategoryId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  localityId?: number;
}
