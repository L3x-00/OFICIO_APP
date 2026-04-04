import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service.js';
import { CreateReviewDto, ModerateReviewDto, ValidateQrDto } from './dto/create-review.dto.js';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // POST /reviews — Crear reseña
  @Post()
  create(@Body() body: CreateReviewDto) {
    return this.reviewsService.create(body);
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

  // GET /reviews — Todas las reseñas (admin)
  @Get()
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

  // PATCH /reviews/:id/moderate — Ocultar o mostrar reseña
  @Patch(':id/moderate')
  moderate(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ModerateReviewDto,
  ) {
    return this.reviewsService.moderate(id, body.isVisible);
  }

  // GET /reviews/qr/:providerId — Generar QR para el proveedor
  @Get('qr/:providerId')
  generateQr(@Param('providerId', ParseIntPipe) providerId: number) {
    return this.reviewsService.generateQrCode(providerId);
  }

  // POST /reviews/qr/validate — Validar código QR escaneado
  @Post('qr/validate')
  validateQr(@Body() body: ValidateQrDto) {
    return this.reviewsService.validateQrCode(body.providerId, body.code);
  }
}
