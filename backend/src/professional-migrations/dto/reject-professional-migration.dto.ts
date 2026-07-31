import { IsString, MaxLength, MinLength } from 'class-validator';

export class RejectProfessionalMigrationDto {
  @IsString()
  @MinLength(10, { message: 'El motivo debe tener al menos 10 caracteres' })
  @MaxLength(500)
  reason: string;
}
