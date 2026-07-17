import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { Prisma } from '../../generated/client/client.js';
import { AvailabilityStatus } from '../../generated/client/enums.js';

export class UpdateOwnProviderProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  businessName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  whatsapp?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @IsOptional()
  @IsObject()
  scheduleJson?: Prisma.InputJsonValue;

  @IsOptional()
  @IsBoolean()
  hasHomeService?: boolean;

  @IsOptional()
  @IsBoolean()
  showPhone?: boolean;

  @IsOptional()
  @IsBoolean()
  showWhatsapp?: boolean;

  @IsOptional()
  @IsBoolean()
  showExactLocation?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  website?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  instagram?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  tiktok?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  facebook?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  linkedin?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  twitterX?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  telegram?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  whatsappBiz?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @IsNumber({}, { each: true })
  @IsPositive({ each: true })
  @Type(() => Number)
  categoryIds?: number[];
}

export class SetProviderAvailabilityDto {
  @IsIn(['DISPONIBLE', 'OCUPADO', 'CON_DEMORA'])
  availability!: AvailabilityStatus;
}
