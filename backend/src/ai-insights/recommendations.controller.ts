import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ArrayMaxSize, IsArray, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { ConversionModelService } from './conversion-model.service.js';

export class ScoreProvidersDto {
  @IsArray()
  @ArrayMaxSize(60)
  @IsInt({ each: true })
  @Type(() => Number)
  providerIds: number[] = [];
}

/**
 * Recomendación pública "Recomendado por la IA". Devuelve la probabilidad de
 * conversión (0-100) de un conjunto de proveedores que el cliente YA está
 * viendo (por eso solo puntúa, no lista: no reordena la búsqueda ni expone
 * contacto). PÚBLICO (sin sesión) y throttled. Si el modelo no está entrenado,
 * el servicio cae a un puntaje heurístico.
 */
@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly model: ConversionModelService) {}

  @Throttle({ default: { ttl: 60000, limit: 30 } })
  @Post('scores')
  async scores(
    @Body() body: ScoreProvidersDto,
  ): Promise<{ scores: Record<number, number> }> {
    const scores = await this.model.scoreProviders(body?.providerIds ?? []);
    return { scores };
  }
}
