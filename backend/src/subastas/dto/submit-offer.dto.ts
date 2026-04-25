import { IsInt, IsNumber, IsString, Min, MaxLength } from 'class-validator';

export class SubmitOfferDto {
  @IsInt()
  serviceRequestId: number;

  @IsNumber()
  @Min(1)
  price: number;

  @IsString()
  @MaxLength(300)
  message: string;
}
