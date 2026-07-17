import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { ReviewsService } from './reviews.service.js';
import type { AuthenticatedRequest } from '../common/interfaces/auth-request.js';
import {
  CreateReviewDto,
  ModerateReviewDto,
  ValidateQrDto,
  CreateReviewReplyDto,
  UpdateReviewDto,
} from './dto/create-review.dto.js';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // POST /reviews — Crear reseña.
  // userId proviene SIEMPRE del JWT — ignoramos cualquier userId que
  // venga en el body para evitar IDOR (suplantar reseñas).
  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Request() req: AuthenticatedRequest, @Body() body: CreateReviewDto) {
    return this.reviewsService.create({ ...body, userId: req.user.userId });
  }

  // GET /reviews/provider/:id — Reseñas de un proveedor
  @Get('provider/:id')
  findByProvider(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reviewsService.findByProvider(
      id,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
    );
  }

  // GET /reviews/can-review/:providerId — ¿el usuario puede reseñar?
  // El front lo usa para habilitar/deshabilitar el botón de reseña.
  @Get('can-review/:providerId')
  @UseGuards(JwtAuthGuard)
  canReview(
    @Request() req: AuthenticatedRequest,
    @Param('providerId', ParseIntPipe) providerId: number,
  ) {
    return this.reviewsService.canReview(req.user.userId, providerId);
  }

  // GET /reviews — Todas las reseñas (admin)
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  findAll(
    @Query('isVisible') isVisible?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reviewsService.findAll({
      isVisible: isVisible !== undefined ? isVisible === 'true' : undefined,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  // PATCH /reviews/:id — Editar una reseña (autor).
  // userId del JWT — la validación de ownership en el service ahora es
  // segura porque el id viene del token, no de un body manipulable.
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  updateReview(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateReviewDto,
  ) {
    return this.reviewsService.updateReview(id, req.user.userId, body);
  }

  // PATCH /reviews/:id/moderate — Ocultar o mostrar reseña
  @Patch(':id/moderate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  moderate(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ModerateReviewDto,
  ) {
    return this.reviewsService.moderate(id, body.isVisible);
  }

  // POST /reviews/:id/replies — Responder una reseña.
  // userId del JWT — antes venía del body y permitía responder en
  // nombre de otro usuario.
  @Post(':id/replies')
  @UseGuards(JwtAuthGuard)
  createReply(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CreateReviewReplyDto,
  ) {
    return this.reviewsService.createReply({
      reviewId: id,
      ...body,
      userId: req.user.userId,
    });
  }

  // GET /reviews/:id/replies — Listar respuestas de una reseña
  @Get(':id/replies')
  getReplies(@Param('id', ParseIntPipe) id: number) {
    return this.reviewsService.getReplies(id);
  }

  // GET /reviews/qr/:providerId — Generar QR para el proveedor
  @Get('qr/:providerId')
  generateQr(@Param('providerId', ParseIntPipe) providerId: number) {
    return this.reviewsService.generateQrCode(providerId);
  }

  // POST /reviews/qr/validate — Validar código QR escaneado.
  // Sin guard cualquier atacante podía enumerar códigos QR brute-force.
  @Post('qr/validate')
  @UseGuards(JwtAuthGuard)
  validateQr(@Body() body: ValidateQrDto) {
    return this.reviewsService.validateQrCode(body.providerId, body.code);
  }
}
