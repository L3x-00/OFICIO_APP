import {
  IsString,
  IsInt,
  IsOptional,
  IsNumber,
  IsDateString,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateServiceRequestDto {
  @IsInt()
  categoryId: number;

  @IsString()
  @MaxLength(500)
  description: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  budgetMin?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  budgetMax?: number;

  @IsOptional()
  @IsDateString()
  desiredDate?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  province?: string;

  @IsOptional()
  @IsString()
  district?: string;

  // Contacto del cliente. Opcional en backend (retrocompat con apps viejas);
  // el formulario lo exige. Se expone SOLO al proveedor elegido. `whatsapp`
  // puede ser el mismo número del teléfono.
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  whatsapp?: string;
}
