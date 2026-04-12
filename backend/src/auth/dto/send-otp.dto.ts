import { IsInt, IsPositive } from 'class-validator';

export class SendOtpDto {
  @IsInt()
  @IsPositive()
  userId: number;
}
