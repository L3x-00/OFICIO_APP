import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { UserReportReason } from '../../generated/client/enums.js';

export class CreateUserReportDto {
  @IsInt()
  reportedUserId: number;

  @IsEnum(UserReportReason)
  reason: UserReportReason;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
