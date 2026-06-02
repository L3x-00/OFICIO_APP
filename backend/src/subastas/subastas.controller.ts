import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { SubastasService } from './subastas.service.js';
import { JwtAuthGuard } from '../auth/jwt.guard.js';
import { CreateServiceRequestDto } from './dto/create-service-request.dto.js';
import { SubmitOfferDto } from './dto/submit-offer.dto.js';
import { AcceptOfferDto } from './dto/accept-offer.dto.js';
import { ArrivedDto } from './dto/arrived.dto.js';
import { PaginateRequestsDto } from './dto/paginate-requests.dto.js';
import type { AuthenticatedRequest } from '../common/interfaces/auth-request.js';

@Controller('subastas')
@UseGuards(JwtAuthGuard)
export class SubastasController {
  constructor(private readonly service: SubastasService) {}

  // ── CLIENTE: Publicar solicitud ──────────────────────────────
  @Post('requests')
  createRequest(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateServiceRequestDto,
  ) {
    return this.service.createRequest(req.user.userId, dto);
  }

  // ── CLIENTE: Ver mis solicitudes + sus ofertas (paginado) ────
  @Get('requests/mine')
  getMyRequests(
    @Request() req: AuthenticatedRequest,
    @Query() q: PaginateRequestsDto,
  ) {
    return this.service.getMyRequests(req.user.userId, q.page, q.limit);
  }

  // ── CLIENTE: Aceptar oferta ──────────────────────────────────
  @Post('requests/accept')
  acceptOffer(
    @Request() req: AuthenticatedRequest,
    @Body() dto: AcceptOfferDto,
  ) {
    return this.service.acceptOffer(req.user.userId, dto);
  }

  // ── CLIENTE: Eliminar solicitud ──────────────────────────────
  @Delete('requests/:id')
  deleteRequest(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.deleteRequest(req.user.userId, id);
  }

  // ── PROVEEDOR: Ver oportunidades disponibles ─────────────────
  // El providerId NUNCA se acepta desde la URL (era IDOR). Se resuelve
  // desde el JWT inyectado por JwtAuthGuard.
  @Get('opportunities/me')
  getOpportunities(@Request() req: AuthenticatedRequest) {
    return this.service.getOpportunitiesByUser(req.user.userId);
  }

  // ── PROVEEDOR: Enviar oferta ─────────────────────────────────
  // El providerId se resuelve internamente desde req.user.userId; el DTO
  // solo lleva datos de la oferta (no identidad).
  @Post('offers')
  submitOffer(
    @Request() req: AuthenticatedRequest,
    @Body() dto: SubmitOfferDto,
  ) {
    return this.service.submitOfferByUser(req.user.userId, dto);
  }

  // ── PROVEEDOR: Retirar oferta ────────────────────────────────
  @Delete('offers/:offerId')
  withdrawOffer(
    @Request() req: AuthenticatedRequest,
    @Param('offerId', ParseIntPipe) offerId: number,
  ) {
    return this.service.withdrawOfferByUser(req.user.userId, offerId);
  }

  // ── PROVEEDOR: Marcar llegada GPS ────────────────────────────
  @Post('offers/arrived')
  markArrived(@Request() req: AuthenticatedRequest, @Body() dto: ArrivedDto) {
    return this.service.markArrivedByUser(req.user.userId, dto);
  }
}
