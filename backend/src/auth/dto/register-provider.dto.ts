import {
  IsString, IsOptional, IsEnum, IsNumber, IsPositive, IsBoolean, IsObject,
  MinLength, MaxLength, Matches, ValidateIf,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

// Normaliza strings vacíos a null para que @IsOptional() los trate correctamente.
// Flutter envía "" en campos no rellenados; sin esto los @Matches fallan.
const NullIfEmpty = () =>
  Transform(({ value }) => (value === '' || value === undefined ? null : value));

export class RegisterProviderDto {
  @IsString()
  @MinLength(2, { message: 'El nombre del negocio debe tener al menos 2 caracteres' })
  @MaxLength(100)
  businessName: string;

  @IsString()
  @MinLength(6, { message: 'El teléfono debe tener al menos 6 caracteres' })
  @MaxLength(20)
  phone: string;

  @IsEnum(['OFICIO', 'NEGOCIO'], { message: 'El tipo debe ser OFICIO o NEGOCIO' })
  type: 'OFICIO' | 'NEGOCIO';

  // ── Campos OFICIO ─────────────────────────────────────────
  @NullIfEmpty()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  dni?: string | null;

  // ── Campos NEGOCIO ────────────────────────────────────────
  @NullIfEmpty()
  @IsOptional()
  @ValidateIf(o => o.ruc !== null && o.ruc !== undefined)
  @Matches(/^\d{11}$/, { message: 'El RUC debe tener exactamente 11 dígitos' })
  ruc?: string | null;

  @NullIfEmpty()
  @IsOptional()
  @ValidateIf(o => o.nombreComercial !== null && o.nombreComercial !== undefined)
  @IsString()
  @MaxLength(100)
  nombreComercial?: string | null;

  @NullIfEmpty()
  @IsOptional()
  @ValidateIf(o => o.razonSocial !== null && o.razonSocial !== undefined)
  @IsString()
  @MaxLength(150)
  razonSocial?: string | null;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  hasDelivery?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  plenaCoordinacion?: boolean;

  // ── Comunes ───────────────────────────────────────────────
  @NullIfEmpty()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  whatsapp?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  categoryId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  localityId?: number;

  @IsOptional()
  @IsObject()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  scheduleJson?: any;
}
