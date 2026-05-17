import { Controller, Post, Get, Param, ParseIntPipe, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard.js';
import { FavoritesService } from './favorites.service.js';

// userId SIEMPRE del JWT — el cliente solo pasa providerId. Antes el
// userId venía del path y permitía crear/listar favoritos de cualquier
// usuario sin autenticación (IDOR).
@Controller('favorites')
@UseGuards(JwtAuthGuard)
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  // POST /favorites/:providerId — toggle
  @Post(':providerId')
  toggle(
    @Request() req: any,
    @Param('providerId', ParseIntPipe) providerId: number,
  ) {
    return this.favoritesService.toggle(req.user.userId, providerId);
  }

  // GET /favorites — listar favoritos del usuario autenticado
  @Get()
  getUserFavorites(@Request() req: any) {
    return this.favoritesService.getUserFavorites(req.user.userId);
  }
}
