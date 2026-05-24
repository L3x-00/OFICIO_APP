import {
  IsString,
  IsOptional,
  IsNumber,
  IsPositive,
  MinLength,
  MaxLength,
  IsBoolean,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateOfferPostDto {
  @IsString()
  @MinLength(5)
  @MaxLength(80)
  title: string;

  @IsString()
  @MinLength(10)
  @MaxLength(500)
  description: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  price?: number;
}

/// DTO de edición — todos los campos opcionales. Si `resetDuration` es
/// true, el service resetea expiresAt = now + planHours del plan vigente.
export class UpdateOfferPostDto {
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(80)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  price?: number;

  // multer + form-data manda 'true'/'false' como string; transform a bool.
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  resetDuration?: boolean;
}
