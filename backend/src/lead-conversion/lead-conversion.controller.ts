import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
} from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { LeadConversionService } from './lead-conversion.service.js';

export class ConvertLeadsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  leadKeys!: string[];

  @IsOptional()
  @IsBoolean()
  approve?: boolean;
}

/**
 * Panel admin de "Captación": lista los leads NEGOCIO en staging y los convierte
 * en `Provider` real (Paso 6) con un botón. Admin-only, igual que el resto de
 * `/admin/*`. La lógica pesada vive en el service (reusa `convertLead`).
 */
@Controller('admin/lead-conversion')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class LeadConversionController {
  constructor(private readonly service: LeadConversionService) {}

  @Get('leads')
  list(
    @Query('consent') consent?: string,
    @Query('district') district?: string,
    @Query('converted') converted?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.listLeads({
      consent,
      district,
      converted,
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 25,
    });
  }

  @Post('convert')
  @HttpCode(HttpStatus.OK)
  convert(@Body() dto: ConvertLeadsDto) {
    return this.service.convert(dto.leadKeys, dto.approve ?? false);
  }
}
