import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { ConversionModelService } from './conversion-model.service.js';
import type { PredictionResultDto } from './conversion-model.service.js';

/** Override manual de features (predicción "what-if" sin un proveedor real). */
class PredictFeaturesDto {
  @IsOptional() @IsNumber() rating?: number;
  @IsOptional() @IsNumber() reviews?: number;
  @IsOptional() @IsString() plan?: string;
  @IsOptional() @IsNumber() completeness?: number;
  @IsOptional() @IsNumber() responseRate?: number;
  @IsOptional() @IsNumber() hasPayments?: number;
}

export class PredictConversionDto {
  /** Si viene, las features se extraen del proveedor real. */
  @IsOptional() @IsInt() providerId?: number;

  /** Alternativa: features manuales para simular un escenario. */
  @IsOptional()
  @ValidateNested()
  @Type(() => PredictFeaturesDto)
  features?: PredictFeaturesDto;
}

/**
 * Endpoint de predicción de conversión — `POST /predict/conversion`.
 * SOLO ADMIN. Devuelve la probabilidad (0-100) + etiqueta y registra la
 * predicción para el panel. Ruta propia (fuera de /ai-insights) por pedido
 * explícito del contrato del módulo.
 */
@Controller('predict')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class PredictController {
  constructor(private readonly model: ConversionModelService) {}

  @Post('conversion')
  conversion(@Body() body: PredictConversionDto): Promise<PredictionResultDto> {
    return this.model.predict({
      providerId: body.providerId,
      features: body.features,
    });
  }
}
