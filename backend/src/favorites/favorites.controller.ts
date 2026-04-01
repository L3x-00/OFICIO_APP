import { Controller, Post, Get, Param, ParseIntPipe } from '@nestjs/common';
import { FavoritesService } from './favorites.service.js';

@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  // POST /favorites/:userId/:providerId — toggle
  @Post(':userId/:providerId')
  toggle(
    @Param('userId',   ParseIntPipe) userId:   number,
    @Param('providerId', ParseIntPipe) providerId: number,
  ) {
    return this.favoritesService.toggle(userId, providerId);
  }

  // GET /favorites/:userId — listar favoritos del usuario
  @Get(':userId')
  getUserFavorites(@Param('userId', ParseIntPipe) userId: number) {
    return this.favoritesService.getUserFavorites(userId);
  }
}