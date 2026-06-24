import {
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

/** Solicitud de cotización. El userId (cliente) sale del JWT, no del body. */
export class CreateQuotationDto {
  @IsInt()
  providerId: number;

  @IsString()
  @MinLength(5, { message: 'Describe lo que necesitas (mín. 5 caracteres)' })
  @MaxLength(1000)
  description: string;

  @IsOptional()
  @IsString()
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  photoUrl?: string;
}
