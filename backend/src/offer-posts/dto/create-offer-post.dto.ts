import { IsString, IsOptional, IsNumber, IsPositive, MinLength, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOfferPostDto {
  @IsString()
  @MinLength(5)
  @MaxLength(80)
  title: string;

  @IsString()
  @MinLength(10)
  @MaxLength(500)
  description: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  price?: number;
}
