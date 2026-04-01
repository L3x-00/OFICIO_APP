import { Controller, Get, Query } from '@nestjs/common';
import { AdminService } from './admin.service.js';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // GET /admin/metrics
  @Get('metrics')
  getMetrics() {
    return this.adminService.getDashboardMetrics();
  }

  // GET /admin/grace-providers
  @Get('grace-providers')
  getGraceProviders() {
    return this.adminService.getGraceProviders();
  }

  // GET /admin/analytics?days=30
  @Get('analytics')
  getAnalytics(@Query('days') days?: string) {
    return this.adminService.getAnalytics(days ? parseInt(days) : 30);
  }
}