import {
  IsEmail,
  IsString,
  IsOptional,
  IsNumber,
  IsPositive,
  IsArray,
  ArrayMaxSize,
  IsIn,
  Max,
  MinLength,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { normalizeProviderType } from '../../common/provider-type.js';

export class CreateProviderDto {
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  email: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  businessName: string;

  @IsString()
  @MinLength(6)
  @MaxLength(20)
  phone: string;

  @IsOptional()
  @IsString()
  whatsapp?: string;

  @Transform(({ value }) => normalizeProviderType(value) ?? value)
  @IsIn(['OFICIO', 'PROFESIONAL', 'NEGOCIO'])
  type: 'OFICIO' | 'PROFESIONAL' | 'NEGOCIO';

  // Datos profesionales: solo Especialidad es obligatoria. Los demás campos
  // son opcionales para no excluir egresados o perfiles por experiencia.
  @ValidateIf((o) => o.type === 'PROFESIONAL')
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  professionalSpecialty?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  professionalInstitution?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(80)
  professionalYearsExperience?: number;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  professionalTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  professionalRegistrationNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  professionalRegistrationIssuer?: string;

  // ── Datos legales OFICIO
  @IsOptional()
  @IsString()
  @MaxLength(20)
  dni?: string;

  // ── Datos legales NEGOCIO
  @IsOptional()
  @IsString()
  @MaxLength(11)
  ruc?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  nombreComercial?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  razonSocial?: string;

  // ── Características NEGOCIO
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  hasDelivery?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  plenaCoordinacion?: boolean;

  // ── Descripción y dirección
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  // ── Especialidades (categorías hijas) y localidad — máx 6 (Premium), una primaria
  @IsArray()
  @ArrayMaxSize(6)
  @IsNumber({}, { each: true })
  @IsPositive({ each: true })
  @Type(() => Number)
  @Transform(({ value }) => {
    // FormData envía cada item como campo repetido; con 1 sola especialidad
    // llega un escalar — lo normalizamos a array para que @IsArray pase.
    if (value === undefined || value === null || value === '') return [];
    return Array.isArray(value) ? value : [value];
  })
  categoryIds: number[];

  // Especialidad principal — debe estar incluida en categoryIds.
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  primaryCategoryId?: number;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  localityId: number;

  // ── Ubicación administrativa
  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  province?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  district?: string;

  // ── Horario (JSON serializado como string en FormData)
  @IsOptional()
  @IsString()
  scheduleJson?: string;
}
