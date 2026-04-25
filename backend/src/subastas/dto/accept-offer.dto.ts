import { IsInt } from 'class-validator';

export class AcceptOfferDto {
  @IsInt()
  offerId: number;
}
