import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SuggestLocalityDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  department!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  province?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  district?: string;
}
