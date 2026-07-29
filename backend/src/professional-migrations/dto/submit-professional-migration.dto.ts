import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const optionalTrimmedText = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const categoryIdsFromFormData = ({ value }: { value: unknown }) => {
  if (Array.isArray(value)) return value.map(Number);
  if (typeof value !== 'string') return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(Number) : value;
  } catch {
    return value.split(',').map((id) => Number(id.trim()));
  }
};

/** Datos mínimos para solicitar el pase de Oficios a Servicios profesionales. */
export class SubmitProfessionalMigrationDto {
  @Transform(optionalTrimmedText)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  specialty: string;

  @IsOptional()
  @Transform(optionalTrimmedText)
  @IsString()
  @MaxLength(160)
  institution?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(80)
  yearsExperience?: number;

  @IsOptional()
  @Transform(optionalTrimmedText)
  @IsString()
  @MaxLength(160)
  professionalTitle?: string;

  @IsOptional()
  @Transform(optionalTrimmedText)
  @IsString()
  @MaxLength(80)
  registrationNumber?: string;

  @IsOptional()
  @Transform(optionalTrimmedText)
  @IsString()
  @MaxLength(160)
  registrationIssuer?: string;

  @Transform(categoryIdsFromFormData)
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(6)
  @IsInt({ each: true })
  @Min(1, { each: true })
  categoryIds: number[];
}
