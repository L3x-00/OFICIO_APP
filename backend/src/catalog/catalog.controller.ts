import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
import type { AuthenticatedRequest } from '../common/interfaces/auth-request.js';
import { memOpts } from '../common/multer-image.config.js';
import { CatalogService } from './catalog.service.js';
import { CreateCatalogProductDto } from './dto/create-catalog-product.dto.js';
import { UpdateCatalogProductDto } from './dto/update-catalog-product.dto.js';
import { ReorderDto } from '../common/dto/reorder.dto.js';

@Controller('providers/:id/catalog')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  /** Catálogo público del proveedor (agrupado). */
  @Get()
  getCatalog(@Param('id', ParseIntPipe) providerId: number) {
    return this.catalog.getPublicCatalog(providerId);
  }

  /** Añade un producto (solo el proveedor dueño + feature catalogo). */
  @Post()
  @UseGuards(JwtAuthGuard)
  add(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) providerId: number,
    @Body() body: CreateCatalogProductDto,
  ) {
    return this.catalog.addProduct(req.user.userId, providerId, body);
  }

  /** Sube la foto de un producto → bucket CDN público; devuelve { url }. */
  @Post('photo')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', memOpts))
  uploadPhoto(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) providerId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.catalog.uploadPhoto(req.user.userId, providerId, file);
  }

  /** Reordena productos en lote (drag & drop). */
  @Patch('reorder')
  @UseGuards(JwtAuthGuard)
  reorder(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) providerId: number,
    @Body() body: ReorderDto,
  ) {
    return this.catalog.reorder(req.user.userId, providerId, body.items);
  }

  /** Alterna disponibilidad (agotado / disponible). */
  @Patch(':productId/toggle')
  @UseGuards(JwtAuthGuard)
  toggle(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) providerId: number,
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    return this.catalog.toggle(req.user.userId, providerId, productId);
  }

  /** Edita un producto. */
  @Patch(':productId')
  @UseGuards(JwtAuthGuard)
  update(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) providerId: number,
    @Param('productId', ParseIntPipe) productId: number,
    @Body() body: UpdateCatalogProductDto,
  ) {
    return this.catalog.updateProduct(
      req.user.userId,
      providerId,
      productId,
      body,
    );
  }

  /** Elimina un producto. */
  @Delete(':productId')
  @UseGuards(JwtAuthGuard)
  remove(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) providerId: number,
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    return this.catalog.deleteProduct(req.user.userId, providerId, productId);
  }
}
