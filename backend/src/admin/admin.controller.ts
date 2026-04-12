import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, ParseIntPipe,
  HttpCode, HttpStatus, Res, UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AdminService } from './admin.service.js';
import { JwtAuthGuard } from '../auth/jwt.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { CreateProviderDto } from './dto/create-provider.dto.js';
import { UpdateProviderDto } from './dto/update-provider.dto.js';
import { ReasonDto, OptionalReasonDto } from './dto/reason.dto.js';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto.js';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ── MÉTRICAS Y ANALYTICS ─────────────────────────────────

  @Get('metrics')
  getMetrics() { return this.adminService.getDashboardMetrics(); }

  @Get('grace-providers')
  getGraceProviders() { return this.adminService.getGraceProviders(); }

  @Get('analytics')
  getAnalytics(@Query('days') days?: string) {
    return this.adminService.getAnalytics(days ? parseInt(days) : 30);
  }

  // ── GESTIÓN DE PROVEEDORES ────────────────────────────────

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
  createProvider(@Body() body: CreateProviderDto) {
    return this.adminService.createProvider(body);
  }

  @Patch('providers/:id')
  updateProvider(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateProviderDto,
  ) {
    return this.adminService.updateProvider(id, body);
  }

  @Patch('providers/:id/toggle-visibility')
  toggleVisibility(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.toggleProviderVisibility(id);
  }

  @Patch('providers/:id/subscription')
  updateSubscription(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { plan: string },
  ) {
    return this.adminService.updateProviderSubscription(id, body.plan);
  }

  @Delete('providers/:id')
  @HttpCode(HttpStatus.OK)
  deleteProvider(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteProvider(id);
  }

  // ── VERIFICACIÓN ──────────────────────────────────────────

  @Get('verification/pending')
  getPendingVerifications() {
    return this.adminService.getPendingVerifications();
  }

  @Patch('providers/:id/approve')
  approveVerification(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.approveVerification(id);
  }

  @Patch('providers/:id/reject')
  rejectVerification(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ReasonDto,
  ) {
    return this.adminService.rejectVerification(id, body.reason);
  }

  @Patch('providers/:id/request-info')
  requestMoreInfo(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ReasonDto,
  ) {
    return this.adminService.requestMoreInfo(id, body.reason);
  }

  @Patch('providers/:id/revoke-verification')
  revokeVerification(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: OptionalReasonDto,
  ) {
    return this.adminService.revokeVerification(id, body.reason);
  }

  // ── GESTIÓN DE USUARIOS ───────────────────────────────────

  @Get('users')
  getUsers(
    @Query('page')     page?:     string,
    @Query('limit')    limit?:    string,
    @Query('search')   search?:   string,
    @Query('role')     role?:     string,
    @Query('isActive') isActive?: string,
  ) {
    return this.adminService.getUsers(
      page     ? parseInt(page)           : 1,
      limit    ? parseInt(limit)          : 20,
      search,
      role,
      isActive !== undefined ? isActive === 'true' : undefined,
    );
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.OK)
  deleteUser(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteUser(id);
  }

  @Patch('users/:id/status')
  updateUserStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('isActive') isActive: boolean,
  ) {
    return this.adminService.updateUserStatus(id, isActive);
  }

  // ── NOTIFICACIONES ────────────────────────────────────────

  @Get('notifications')
  getNotifications(
    @Query('page')  page?:  string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getNotifications(
      page  ? parseInt(page)  : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Patch('notifications/:id/read')
  markNotificationRead(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.markNotificationRead(id);
  }

  @Patch('notifications/read-all')
  markAllNotificationsRead() {
    return this.adminService.markAllNotificationsRead();
  }

  // ── REPORTES ──────────────────────────────────────────────

  @Get('reports')
  getReports() { return this.adminService.getReports(); }

  @Get('reports/export/users')
  async exportUsersCSV(@Res() res: Response) {
    const csv = await this.adminService.exportUsersCSV();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="usuarios.csv"');
    res.send('\uFEFF' + csv);
  }

  @Get('reports/export/providers')
  async exportProvidersCSV(@Res() res: Response) {
    const csv = await this.adminService.exportProvidersCSV();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="proveedores.csv"');
    res.send('\uFEFF' + csv);
  }

  // ── CRUD DE CATEGORÍAS ────────────────────────────────────

  @Get('categories')
  getCategories() { return this.adminService.getCategories(); }

  @Post('categories')
  createCategory(@Body() body: CreateCategoryDto) {
    return this.adminService.createCategory(body);
  }

  @Patch('categories/:id')
  updateCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateCategoryDto,
  ) {
    return this.adminService.updateCategory(id, body);
  }

  @Patch('categories/:id/toggle')
  toggleCategoryActive(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.toggleCategoryActive(id);
  }
}
