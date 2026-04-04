import {
  IsString, IsOptional, IsEnum, IsNumber, IsPositive,
  MinLength, MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

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

  @IsOptional()
  @IsString()
  @MaxLength(20)
  dni?: string;

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
}
