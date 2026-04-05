import {
  Controller, Get, Patch, Post, Delete, Body, Request,
  UseGuards, Query, Param, ParseIntPipe,
} from '@nestjs/common';
import { ProviderProfileService } from './provider-profile.service.js';
import { JwtAuthGuard } from '../auth/jwt.guard.js';

@Controller('provider-profile')
@UseGuards(JwtAuthGuard)
export class ProviderProfileController {
  constructor(private readonly service: ProviderProfileService) {}

  // GET /provider-profile/me
  @Get('me')
  getMyProfile(@Request() req: any) {
    return this.service.getMyProfile(req.user.userId);
  }

  // PATCH /provider-profile/me
  @Patch('me')
  updateMyProfile(@Request() req: any, @Body() body: any) {
    return this.service.updateMyProfile(req.user.userId, body);
  }

  // PATCH /provider-profile/me/availability
  @Patch('me/availability')
  setAvailability(@Request() req: any, @Body() body: { availability: any }) {
    return this.service.setAvailability(req.user.userId, body.availability);
  }

  // GET /provider-profile/me/analytics?days=30
  @Get('me/analytics')
  getMyAnalytics(
    @Request() req: any,
    @Query('days') days?: string,
  ) {
    return this.service.getMyAnalytics(req.user.userId, days ? parseInt(days) : 30);
  }

  // GET /provider-profile/me/notifications
  @Get('me/notifications')
  getMyNotifications(@Request() req: any) {
    return this.service.getMyNotifications(req.user.userId);
  }

  // PATCH /provider-profile/me/notifications/:id/read
  @Patch('me/notifications/:id/read')
  markNotificationRead(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.markNotificationRead(req.user.userId, id);
  }

  // POST /provider-profile/me/images — vincula imagen subida al perfil del proveedor
  @Post('me/images')
  addImage(
    @Request() req: any,
    @Body() body: { url: string; isCover?: boolean },
  ) {
    return this.service.addImage(req.user.userId, body.url, body.isCover ?? false);
  }

  // DELETE /provider-profile/me/images/:id — elimina imagen del perfil
  @Delete('me/images/:id')
  deleteImage(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.deleteImage(req.user.userId, id);
  }
}
