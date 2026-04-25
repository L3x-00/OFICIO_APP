import {
  Controller, Post, Get, Patch, Body, Param, Request,
  UseGuards, UseInterceptors, UploadedFiles, Query,
  ParseIntPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { TrustValidationService } from './trust-validation.service.js';
import { JwtAuthGuard } from '../auth/jwt.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';

@Controller('trust-validation')
export class TrustValidationController {
  constructor(private readonly service: TrustValidationService) {}

  // POST /trust-validation/request?type=OFICIO|NEGOCIO
  @Post('request')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'dniPhotoFront', maxCount: 1 },
    { name: 'dniPhotoBack',  maxCount: 1 },
    { name: 'selfieWithDni', maxCount: 1 },
    { name: 'businessPhoto', maxCount: 1 },
    { name: 'ownerDniPhoto', maxCount: 1 },
  ], { storage: memoryStorage() }))
  submitRequest(
    @Request() req: any,
    @Query('type') type = 'OFICIO',
    @Body() body: any,
    @UploadedFiles() files: any,
  ) {
    return this.service.submitRequest(req.user.userId, type, body, files ?? {});
  }

  // GET /trust-validation/my-status?type=OFICIO|NEGOCIO
  @Get('my-status')
  @UseGuards(JwtAuthGuard)
  getMyStatus(
    @Request() req: any,
    @Query('type') type = 'OFICIO',
  ) {
    return this.service.getMyTrustStatus(req.user.userId, type);
  }

  // GET /trust-validation/admin/list?status=PENDING
  @Get('admin/list')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  listRequests(@Query('status') status?: string) {
    return this.service.listPendingRequests(status);
  }

  // GET /trust-validation/admin/:id
  @Get('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  getDetail(@Param('id', ParseIntPipe) id: number) {
    return this.service.getRequestDetail(id);
  }

  // PATCH /trust-validation/admin/:id/approve
  @Patch('admin/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  approve(@Param('id', ParseIntPipe) id: number) {
    return this.service.approveRequest(id);
  }

  // PATCH /trust-validation/admin/:id/reject
  @Patch('admin/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  reject(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason: string,
  ) {
    return this.service.rejectRequest(id, reason);
  }
}
