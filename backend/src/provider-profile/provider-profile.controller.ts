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

  // GET /provider-profile/me?type=OFICIO|NEGOCIO
  @Get('me')
  getMyProfile(
    @Request() req: any,
    @Query('type') type?: string,
  ) {
    return this.service.getMyProfile(req.user.userId, type);
  }

  // PATCH /provider-profile/me?type=OFICIO|NEGOCIO
  @Patch('me')
  updateMyProfile(
    @Request() req: any,
    @Body() body: any,
    @Query('type') type?: string,
  ) {
    return this.service.updateMyProfile(req.user.userId, body, type);
  }

  // PATCH /provider-profile/me/availability?type=OFICIO|NEGOCIO
  @Patch('me/availability')
  setAvailability(
    @Request() req: any,
    @Body() body: { availability: any },
    @Query('type') type?: string,
  ) {
    return this.service.setAvailability(req.user.userId, body.availability, type);
  }

  // GET /provider-profile/me/analytics?days=30&type=OFICIO|NEGOCIO
  @Get('me/analytics')
  getMyAnalytics(
    @Request() req: any,
    @Query('days') days?: string,
    @Query('type') type?: string,
  ) {
    return this.service.getMyAnalytics(req.user.userId, days ? parseInt(days) : 30, type);
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

  // POST /provider-profile/me/images?type=OFICIO|NEGOCIO — vincula imagen subida al perfil del proveedor
  @Post('me/images')
  addImage(
    @Request() req: any,
    @Body() body: { url: string; isCover?: boolean },
    @Query('type') type?: string,
  ) {
    return this.service.addImage(req.user.userId, body.url, body.isCover ?? false, type);
  }

  // DELETE /provider-profile/me/images/:id?type=OFICIO|NEGOCIO — elimina imagen del perfil
  @Delete('me/images/:id')
  deleteImage(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Query('type') type?: string,
  ) {
    return this.service.deleteImage(req.user.userId, id, type);
  }

  // POST /provider-profile/me/plan-request?type=OFICIO|NEGOCIO
  @Post('me/plan-request')
  requestPlanUpgrade(
    @Request() req: any,
    @Body() body: { plan: string },
    @Query('type') type?: string,
  ) {
    return this.service.requestPlanUpgrade(req.user.userId, body.plan, type);
  }
}
