import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Request,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt.guard.js';
import { FeatureFlag } from '../common/feature-flag.guard.js';
import type { AuthenticatedRequest } from '../common/interfaces/auth-request.js';
import { memOpts } from '../common/multer-image.config.js';
import { QuotationsService } from './quotations.service.js';
import { CreateQuotationDto } from './dto/create-quotation.dto.js';
import { RespondQuotationDto } from './dto/respond-quotation.dto.js';

@Controller('quotations')
@UseGuards(JwtAuthGuard)
export class QuotationsController {
  constructor(private readonly quotations: QuotationsService) {}

  // ── CLIENTE ────────────────────────────────────────────────

  // Feature OCULTA (2026-07): solo se bloquea CREAR nuevas cotizaciones
  // (foto + create). Listar y responder quedan vivos para drenar las
  // pendientes existentes.

  /** Sube la foto del problema/proyecto → { url } (estática, antes de :id). */
  @Post('photo')
  @UseGuards(FeatureFlag('FEATURE_COTIZACION'))
  @UseInterceptors(FileInterceptor('file', memOpts))
  uploadPhoto(@UploadedFile() file: Express.Multer.File) {
    return this.quotations.uploadPhoto(file);
  }

  /** Crea una solicitud de cotización. */
  @Post()
  @UseGuards(FeatureFlag('FEATURE_COTIZACION'))
  create(
    @Request() req: AuthenticatedRequest,
    @Body() body: CreateQuotationDto,
  ) {
    return this.quotations.create(req.user.userId, body);
  }

  /** Cotizaciones del usuario autenticado (como cliente). */
  @Get('mine')
  listMine(@Request() req: AuthenticatedRequest) {
    return this.quotations.listMine(req.user.userId);
  }

  // ── PROVEEDOR ──────────────────────────────────────────────

  /** Cotizaciones recibidas por el proveedor. */
  @Get('provider/mine')
  listForProvider(@Request() req: AuthenticatedRequest) {
    return this.quotations.listForProvider(req.user.userId);
  }

  /** Responde con un presupuesto (solo el proveedor dueño). */
  @Patch(':id/respond')
  respond(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: RespondQuotationDto,
  ) {
    return this.quotations.respond(
      req.user.userId,
      id,
      body.response,
      body.estimatedPrice,
    );
  }

  /** Rechaza la solicitud (solo el proveedor dueño). */
  @Patch(':id/reject')
  reject(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.quotations.reject(req.user.userId, id);
  }
}
