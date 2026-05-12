import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt.guard.js';
import { LocalitiesService } from './localities.service.js';
import { SuggestLocalityDto } from './dto/suggest-locality.dto.js';

@Controller('localities')
export class LocalitiesController {
  constructor(private readonly service: LocalitiesService) {}

  /**
   * POST /localities/suggest — el usuario propone una ubicación detectada
   * por GPS que no estaba en el catálogo seed. Rate-limit estricto para
   * evitar spam (la BD no debería llenarse de basura).
   */
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 60_000, limit: 6 } })
  @Post('suggest')
  suggest(@Body() dto: SuggestLocalityDto) {
    return this.service.suggest(dto);
  }

  /**
   * GET /localities/extras — devuelve las localidades NO-seed (sugeridas
   * por usuarios o añadidas por admin). El mobile las fusiona con su
   * catálogo estático en `peru_locations.dart` al iniciar la app.
   */
  @Get('extras')
  listExtras() {
    return this.service.listExtras();
  }
}
