import { IsString, IsOptional, IsInt, IsPositive, MinLength, MaxLength, Matches } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCategoryDto {
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(50)
  name: string;

  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'El slug solo puede contener letras minúsculas, números y guiones' })
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
}

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  iconUrl?: string;

  /** null = promover a categoría raíz; number = asignar nuevo padre. */
  @IsOptional()
  @Type(() => Number)
  parentId?: number | null;
}
