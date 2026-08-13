import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import type { AuthenticatedRequest } from '../common/interfaces/auth-request.js';
import { WhatsappOperationsService } from './whatsapp-operations.service.js';

/** Panel operativo F4. ADMIN + JWT; respuestas sin PII ni contenido. */
@Controller('admin/whatsapp-assistant')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class WhatsappOperationsController {
  constructor(private readonly operations: WhatsappOperationsService) {}

  @Get('summary')
  summary() {
    return this.operations.getSummary();
  }

  @Get('handovers')
  handovers(@Query('limit') rawLimit?: string) {
    return this.operations.listOpenHandovers(this.parseLimit(rawLimit));
  }

  @Post('handovers/:id/acknowledge')
  async acknowledgeHandover(
    @Param('id') rawId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const ok = await this.operations.acknowledgeHandover(
      this.parseId(rawId),
      req.user.userId,
    );
    if (!ok) throw new NotFoundException('Handover no disponible.');
    return { ok: true };
  }

  @Get('delivery-failures')
  deliveryFailures(@Query('limit') rawLimit?: string) {
    return this.operations.listPendingDeliveryFailures(
      this.parseLimit(rawLimit),
    );
  }

  @Post('delivery-failures/:id/acknowledge')
  async acknowledgeDeliveryFailure(
    @Param('id') rawId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const ok = await this.operations.acknowledgeDeliveryFailure(
      this.parseId(rawId),
      req.user.userId,
    );
    if (!ok) throw new NotFoundException('Fallo no disponible.');
    return { ok: true };
  }

  private parseLimit(raw: string | undefined): number {
    if (!raw) return 30;
    const limit = Number(raw);
    return Number.isSafeInteger(limit) ? limit : 30;
  }

  private parseId(raw: string): number {
    const id = Number.parseInt(raw, 10);
    if (!Number.isSafeInteger(id) || id <= 0 || String(id) !== raw) {
      throw new BadRequestException('Identificador inválido.');
    }
    return id;
  }
}
