import { IsInt, IsNumber } from 'class-validator';

export class ArrivedDto {
  @IsInt()
  offerId: number;

  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;
}
