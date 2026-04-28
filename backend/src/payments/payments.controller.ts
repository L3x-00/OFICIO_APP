import {
  Controller, Post, Get, Patch, Body, Param,
  UseGuards, Request, Query,
} from '@nestjs/common';
import { PaymentsService } from './payments.service.js';
import { SubmitYapeDto } from './dto/submit-yape.dto.js';
import { JwtAuthGuard } from '../auth/jwt.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';

@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly svc: PaymentsService) {}

  // ── Proveedor: enviar comprobante Yape ───────────────────────
  @Post('yape')
  submitYape(@Request() req: any, @Body() dto: SubmitYapeDto) {
    return this.svc.submitYapePayment(req.user.id, dto);
  }

  // ── Proveedor: historial de pagos ────────────────────────────
  @Get('yape/mine')
  myPayments(@Request() req: any) {
    return this.svc.getMyPayments(req.user.id);
  }

  // ── Proveedor: cancelar plan activo ──────────────────────────
  @Patch('cancel-plan')
  cancelPlan(@Request() req: any) {
    return this.svc.cancelPlan(req.user.id);
  }

  // ── Admin: listar pagos ──────────────────────────────────────
  @Get('admin/yape')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  adminList(@Query('status') status?: string) {
    return this.svc.adminList(status);
  }

  // ── Admin: aprobar pago ──────────────────────────────────────
  @Patch('admin/yape/:id/approve')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  approve(@Param('id') id: string, @Request() req: any) {
    return this.svc.approvePayment(Number(id), req.user.id);
  }

  // ── Admin: rechazar pago ─────────────────────────────────────
  @Patch('admin/yape/:id/reject')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  reject(
    @Param('id') id: string,
    @Request() req: any,
    @Body('reason') reason?: string,
  ) {
    return this.svc.rejectPayment(Number(id), req.user.id, reason);
  }
}
