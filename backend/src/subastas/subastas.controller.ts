import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { SubastasService } from './subastas.service.js';
import { JwtAuthGuard } from '../auth/jwt.guard.js';
import { CreateServiceRequestDto } from './dto/create-service-request.dto.js';
import { SubmitOfferDto } from './dto/submit-offer.dto.js';
import { AcceptOfferDto } from './dto/accept-offer.dto.js';
import { ArrivedDto } from './dto/arrived.dto.js';

@Controller('subastas')
@UseGuards(JwtAuthGuard)
export class SubastasController {
  constructor(private readonly service: SubastasService) {}

  // ── CLIENTE: Publicar solicitud ──────────────────────────────
  @Post('requests')
  createRequest(@Request() req, @Body() dto: CreateServiceRequestDto) {
    return this.service.createRequest(req.user.userId, dto);
  }

  // ── CLIENTE: Ver mis solicitudes + sus ofertas ───────────────
  @Get('requests/mine')
  getMyRequests(@Request() req) {
    return this.service.getMyRequests(req.user.userId);
  }

  // ── CLIENTE: Aceptar oferta ──────────────────────────────────
  @Post('requests/accept')
  acceptOffer(@Request() req, @Body() dto: AcceptOfferDto) {
    return this.service.acceptOffer(req.user.userId, dto);
  }

  // ── PROVEEDOR: Ver oportunidades disponibles ─────────────────
  @Get('opportunities/:providerId')
  getOpportunities(@Param('providerId', ParseIntPipe) providerId: number) {
    return this.service.getOpportunities(providerId);
  }

  // ── PROVEEDOR: Enviar oferta ─────────────────────────────────
  @Post('offers')
  submitOffer(@Request() req, @Body() dto: SubmitOfferDto) {
    // providerId se resuelve en el servicio buscando por userId + tipo activo
    // Para simplicidad, el DTO incluye providerId como campo adicional
    return this.service.submitOfferByUser(req.user.userId, dto);
  }

  // ── PROVEEDOR: Retirar oferta ────────────────────────────────
  @Delete('offers/:offerId')
  withdrawOffer(
    @Request() req,
    @Param('offerId', ParseIntPipe) offerId: number,
  ) {
    return this.service.withdrawOfferByUser(req.user.userId, offerId);
  }

  // ── PROVEEDOR: Marcar llegada GPS ────────────────────────────
  @Post('offers/arrived')
  markArrived(@Request() req, @Body() dto: ArrivedDto) {
    return this.service.markArrivedByUser(req.user.userId, dto);
  }
}
