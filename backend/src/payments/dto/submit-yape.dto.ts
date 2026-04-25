import { IsString, IsNotEmpty, IsNumber, IsOptional, Min, Length } from 'class-validator';

export class SubmitYapeDto {
  @IsString()
  @IsNotEmpty()
  plan: string;

  @IsNumber()
  @Min(1)
  amount: number;

  @IsString()
  @IsNotEmpty()
  voucherUrl: string;

  @IsString()
  @Length(3, 3, { message: 'El código debe tener exactamente 3 dígitos' })
  verificationCode: string;

  @IsOptional()
  @IsString()
  note?: string;
}
