import {
  IsNumber, IsString, IsOptional, Min, Max, IsPositive, MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateReviewDto {
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  providerId: number;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  userId: number;

  @Type(() => Number)
  @IsNumber()
  @Min(1, { message: 'La calificación mínima es 1' })
  @Max(5, { message: 'La calificación máxima es 5' })
  rating: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;

  @IsString()
  @MaxLength(500) // Es buena práctica poner un límite a las URLs
  photoUrl: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  userLatAtReview?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  userLngAtReview?: number;

  @IsOptional()
  @IsString()
  qrCodeUsed?: string;
}

export class ModerateReviewDto {
  @IsOptional()
  isVisible: boolean;
}

export class ValidateQrDto {
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  providerId: number;

  @IsString()
  code: string;
}
