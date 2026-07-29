import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import type { AuthenticatedRequest } from '../common/interfaces/auth-request.js';
import { trustValidationImagesOpts } from '../common/multer-image.config.js';
import { RejectProfessionalMigrationDto } from './dto/reject-professional-migration.dto.js';
import { SubmitProfessionalMigrationDto } from './dto/submit-professional-migration.dto.js';
import { ProfessionalMigrationsService } from './professional-migrations.service.js';

@Controller('provider-profile/me')
@UseGuards(JwtAuthGuard)
export class ProfessionalMigrationsController {
  constructor(private readonly service: ProfessionalMigrationsService) {}

  @Post('professional-migration')
  @UseInterceptors(
    FileFieldsInterceptor(
      [{ name: 'credentials', maxCount: 4 }],
      trustValidationImagesOpts,
    ),
  )
  submit(
    @Request() req: AuthenticatedRequest,
    @Body() dto: SubmitProfessionalMigrationDto,
    @UploadedFiles() files: { credentials?: Express.Multer.File[] },
  ) {
    return this.service.submit(req.user.userId, dto, files ?? {});
  }

  @Get('professional-migration')
  getMine(@Request() req: AuthenticatedRequest) {
    return this.service.getMine(req.user.userId);
  }
}

@Controller('admin/professional-migrations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminProfessionalMigrationsController {
  constructor(private readonly service: ProfessionalMigrationsService) {}

  @Get()
  list(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listForAdmin(
      status,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
    );
  }

  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.service.getForAdmin(id);
  }

  @Patch(':id/approve')
  @HttpCode(HttpStatus.OK)
  approve(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.approve(id, req.user.userId);
  }

  @Patch(':id/reject')
  @HttpCode(HttpStatus.OK)
  reject(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
    @Body() dto: RejectProfessionalMigrationDto,
  ) {
    return this.service.reject(id, req.user.userId, dto.reason);
  }
}
