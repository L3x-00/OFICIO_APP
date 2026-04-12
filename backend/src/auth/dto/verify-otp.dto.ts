import { IsInt, IsPositive, IsString, Length } from 'class-validator';

export class VerifyOtpDto {
  @IsInt()
  @IsPositive()
  userId: number;

  @IsString()
  @Length(6, 6, { message: 'El código debe tener exactamente 6 dígitos' })
  code: string;
}
