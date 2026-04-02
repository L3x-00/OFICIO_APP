import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, ParseIntPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { AdminService } from './admin.service.js';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('metrics')
  getMetrics() { return this.adminService.getDashboardMetrics(); }

  @Get('grace-providers')
  getGraceProviders() { return this.adminService.getGraceProviders(); }

  @Get('analytics')
  getAnalytics(@Query('days') days?: string) {
    return this.adminService.getAnalytics(days ? parseInt(days) : 30);
  }

  @Get('providers')
  getAllProviders(
    @Query('page')   page?:   string,
    @Query('limit')  limit?:  string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getAllProviders(
      page  ? parseInt(page)  : 1,
      limit ? parseInt(limit) : 15,
      search,
    );
  }

  @Get('form-options')
  getFormOptions() { return this.adminService.getFormOptions(); }

  @Post('providers')
  createProvider(@Body() body: any) {
    return this.adminService.createProvider(body);
  }

  @Patch('providers/:id')
  updateProvider(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    return this.adminService.updateProvider(id, body);
  }

  @Patch('providers/:id/toggle-visibility')
  toggleVisibility(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.toggleProviderVisibility(id);
  }

  @Patch('providers/:id/approve')
  approveVerification(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.approveVerification(id);
  }

  @Delete('providers/:id')
  @HttpCode(HttpStatus.OK)
  deleteProvider(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteProvider(id);
  }
}