import {
  IsNumber,
  IsString,
  IsOptional,
  Min,
  Max,
  IsPositive,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateReviewDto {
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  providerId: number;

  // userId: el controller SIEMPRE lo sobrescribe con el del JWT
  // (`{ ...body, userId: req.user.userId }`), así que aceptarlo del
  // cliente NO es IDOR — se descarta. Lo decoramos @IsOptional para
  // que un build del móvil que todavía lo envíe NO rebote con 400
  // "property userId should not exist" por forbidNonWhitelisted.
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  userId?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(1, { message: 'La calificación mínima es 1' })
  @Max(5, { message: 'La calificación máxima es 5' })
  rating: number;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'El comentario no puede exceder 500 caracteres' })
  comment?: string;

  // MaxLength(500) era demasiado bajo — las URLs presigned de R2/S3
  // incluyen query params (X-Amz-Signature, X-Amz-Date, X-Amz-Expires,
  // etc.) y pasan los 700 chars fácilmente. ValidationPipe rechazaba
  // con "Bad Request" sin mensaje claro y el user veía "property userId
  // should not exist" como mensaje crónico. 2000 cubre con margen.
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  photoUrl?: string;
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

export class UpdateReviewDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1, { message: 'La calificación mínima es 1' })
  @Max(5, { message: 'La calificación máxima es 5' })
  rating?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'El comentario no puede exceder 500 caracteres' })
  comment?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  photoUrl?: string;

  // userId NO se acepta del cliente — viene del JWT en el controller.
}

export class CreateReviewReplyDto {
  // userId: el controller lo sobrescribe con el del JWT. @IsOptional
  // para tolerar builds del móvil que todavía lo envíen sin romper
  // la validación (forbidNonWhitelisted).
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  userId?: number;

  @IsString()
  @MaxLength(1000)
  content: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  photoUrl?: string;
}
