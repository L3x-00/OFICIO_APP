import {
  IsString,
  IsOptional,
  IsInt,
  IsPositive,
  IsIn,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

const CATEGORY_PROVIDER_TYPES = [
  'OFICIO',
  'PROFESIONAL',
  'NEGOCIO',
  // Clientes publicados antes de PROFESIONAL / NEGOCIO en español.
  'PROFESSIONAL',
  'BUSINESS',
] as const;

function normalizeCategoryProviderTypeInput(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().toUpperCase() : value;
}

export class CreateCategoryDto {
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(50)
  name: string;

  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'El slug solo puede contener letras minúsculas, números y guiones',
  })
  slug: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  iconUrl?: string;

  /** Si se provee, esta categoría queda como hija del padre dado. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  parentId?: number;

  /** 'OFICIO' | 'NEGOCIO' | null — si null aplica a ambos tipos */
  @IsOptional()
  @Transform(({ value }) => normalizeCategoryProviderTypeInput(value))
  @IsString()
  @IsIn(CATEGORY_PROVIDER_TYPES, {
    message: 'forType debe ser OFICIO, PROFESIONAL o NEGOCIO',
  })
  forType?: string | null;
}

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'El slug solo puede contener letras minúsculas, números y guiones',
  })
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  iconUrl?: string;

  /** null = promover a categoría raíz; number = asignar nuevo padre. */
  @IsOptional()
  @Type(() => Number)
  parentId?: number | null;

  @IsOptional()
  @Transform(({ value }) => normalizeCategoryProviderTypeInput(value))
  @IsString()
  @IsIn(CATEGORY_PROVIDER_TYPES, {
    message: 'forType debe ser OFICIO, PROFESIONAL o NEGOCIO',
  })
  forType?: string | null;
}
