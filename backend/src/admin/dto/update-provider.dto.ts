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

  // ── Redes sociales / contacto extendido ──────────────────
  @IsOptional() @IsString() @MaxLength(300) website?: string;
  @IsOptional() @IsString() @MaxLength(300) instagram?: string;
  @IsOptional() @IsString() @MaxLength(300) tiktok?: string;
  @IsOptional() @IsString() @MaxLength(300) facebook?: string;
  @IsOptional() @IsString() @MaxLength(300) linkedin?: string;
  @IsOptional() @IsString() @MaxLength(300) twitterX?: string;
  @IsOptional() @IsString() @MaxLength(300) telegram?: string;
  @IsOptional() @IsString() @MaxLength(20) whatsappBiz?: string;

  // ── Toggles de privacidad (independientes del plan) ──────
  @IsOptional() @IsBoolean() showPhone?: boolean;
  @IsOptional() @IsBoolean() showWhatsapp?: boolean;
  @IsOptional() @IsBoolean() showExactLocation?: boolean;

  // ── Datos de negocio / identidad ─────────────────────────
  @IsOptional() @IsString() @MaxLength(15) dni?: string;
  @IsOptional() @IsString() @MaxLength(15) ruc?: string;
  @IsOptional() @IsString() @MaxLength(150) nombreComercial?: string;
  @IsOptional() @IsString() @MaxLength(200) razonSocial?: string;
  @IsOptional() @IsBoolean() hasDelivery?: boolean;
}
