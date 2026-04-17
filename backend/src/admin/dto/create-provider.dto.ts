import {
  IsEmail, IsString, IsOptional, IsEnum, IsNumber, IsPositive,
  MinLength, MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

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
  @MinLength(2, { message: 'El nombre del negocio debe tener al menos 2 caracteres' })
  @MaxLength(100)
  businessName: string;

  @IsString()
  @MinLength(6)
  @MaxLength(20)
  phone: string;
  
  @IsString()
  @IsOptional() // <--- Agrega esto
  whatsapp?: string;

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

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  categoryId: number;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  localityId: number;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;
}
