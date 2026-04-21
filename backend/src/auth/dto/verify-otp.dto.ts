import { IsString, IsUUID, Length } from 'class-validator';

export class VerifyOtpDto {
  @IsString()
  @IsUUID()
  pendingId: string;

  @IsString()
  @Length(6, 6, { message: 'El código debe tener exactamente 6 dígitos' })
  code: string;
}
