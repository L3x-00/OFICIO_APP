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
import { MenuService } from './menu.service.js';
import { CreateMenuItemDto } from './dto/create-menu-item.dto.js';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto.js';
import { ReorderDto } from '../common/dto/reorder.dto.js';

@Controller('providers/:id/menu')
export class MenuController {
  constructor(private readonly menu: MenuService) {}

  /** Carta pública del proveedor (agrupada). */
  @Get()
  getMenu(@Param('id', ParseIntPipe) providerId: number) {
    return this.menu.getPublicMenu(providerId);
  }

  /** Añade un plato (solo el proveedor dueño + feature carta_digital). */
  @Post()
  @UseGuards(JwtAuthGuard)
  add(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) providerId: number,
    @Body() body: CreateMenuItemDto,
  ) {
    return this.menu.addItem(req.user.userId, providerId, body);
  }

  /** Sube la foto de un plato → bucket CDN público; devuelve { url }. */
  @Post('photo')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', memOpts))
  uploadPhoto(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) providerId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.menu.uploadPhoto(req.user.userId, providerId, file);
  }

  /** Reordena ítems en lote (drag & drop). */
  @Patch('reorder')
  @UseGuards(JwtAuthGuard)
  reorder(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) providerId: number,
    @Body() body: ReorderDto,
  ) {
    return this.menu.reorder(req.user.userId, providerId, body.items);
  }

  /** Alterna disponibilidad (agotado / disponible). */
  @Patch(':itemId/toggle')
  @UseGuards(JwtAuthGuard)
  toggle(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) providerId: number,
    @Param('itemId', ParseIntPipe) itemId: number,
  ) {
    return this.menu.toggle(req.user.userId, providerId, itemId);
  }

  /** Edita un plato. */
  @Patch(':itemId')
  @UseGuards(JwtAuthGuard)
  update(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) providerId: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() body: UpdateMenuItemDto,
  ) {
    return this.menu.updateItem(req.user.userId, providerId, itemId, body);
  }

  /** Elimina un plato. */
  @Delete(':itemId')
  @UseGuards(JwtAuthGuard)
  remove(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) providerId: number,
    @Param('itemId', ParseIntPipe) itemId: number,
  ) {
    return this.menu.deleteItem(req.user.userId, providerId, itemId);
  }
}
