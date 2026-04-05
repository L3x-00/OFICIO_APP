import { IsEmail, IsString, Length, MinLength, MaxLength } from 'class-validator';

export class ResetPasswordDto {
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  email: string;

  @IsString({ message: 'El código de verificación es requerido' })
  @Length(6, 6, { message: 'El código debe tener 6 dígitos' })
  token: string;

  @IsString()
  @MinLength(8, { message: 'La nueva contraseña debe tener al menos 8 caracteres' })
  @MaxLength(64)
  newPassword: string;
}
