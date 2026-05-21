import {
  IsEmail, IsString, IsOptional, IsEnum, IsNumber, IsPositive,
  IsArray, ArrayMaxSize, MinLength, MaxLength,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateProviderDto {
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  email: string;

  @IsString() @MinLength(2) @MaxLength(50)
  firstName: string;

  @IsString() @MinLength(2) @MaxLength(50)
  lastName: string;

  @IsString() @MinLength(2) @MaxLength(100)
  businessName: string;

  @IsString() @MinLength(6) @MaxLength(20)
  phone: string;

  @IsOptional() @IsString()
  whatsapp?: string;

  @IsEnum(['OFICIO', 'NEGOCIO'])
  type: 'OFICIO' | 'NEGOCIO';

  // ── Datos legales OFICIO
  @IsOptional() @IsString() @MaxLength(20)
  dni?: string;

  // ── Datos legales NEGOCIO
  @IsOptional() @IsString() @MaxLength(11)
  ruc?: string;

  @IsOptional() @IsString() @MaxLength(120)
  nombreComercial?: string;

  @IsOptional() @IsString() @MaxLength(200)
  razonSocial?: string;

  // ── Características NEGOCIO
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  hasDelivery?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  plenaCoordinacion?: boolean;

  // ── Descripción y dirección
  @IsOptional() @IsString() @MaxLength(1000)
  description?: string;

  @IsOptional() @IsString() @MaxLength(200)
  address?: string;

  // ── Especialidades (categorías hijas) y localidad — máx 3, una primaria
  @IsArray() @ArrayMaxSize(3) @IsNumber({}, { each: true }) @IsPositive({ each: true }) @Type(() => Number)
  @Transform(({ value }) => {
    // FormData envía cada item como campo repetido; con 1 sola especialidad
    // llega un escalar — lo normalizamos a array para que @IsArray pase.
    if (value === undefined || value === null || value === '') return [];
    return Array.isArray(value) ? value : [value];
  })
  categoryIds: number[];

  // Especialidad principal — debe estar incluida en categoryIds.
  @IsOptional() @Type(() => Number) @IsNumber() @IsPositive()
  primaryCategoryId?: number;

  @Type(() => Number) @IsNumber() @IsPositive()
  localityId: number;

  // ── Ubicación administrativa
  @IsOptional() @IsString() @MaxLength(100)
  department?: string;

  @IsOptional() @IsString() @MaxLength(100)
  province?: string;

  @IsOptional() @IsString() @MaxLength(100)
  district?: string;

  // ── Horario (JSON serializado como string en FormData)
  @IsOptional() @IsString()
  scheduleJson?: string;
}
