import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Param,
  Query,
  Body,
  Request,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard.js';
import type { AuthenticatedRequest } from '../common/interfaces/auth-request.js';
import { AppointmentsService } from './appointments.service.js';
import { CreateAppointmentDto } from './dto/create-appointment.dto.js';
import { SetScheduleDto } from './dto/set-schedule.dto.js';
import { RejectAppointmentDto } from './dto/reject-appointment.dto.js';

@Controller('appointments')
@UseGuards(JwtAuthGuard)
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  // ── PROVEEDOR (rutas estáticas primero, antes de :id) ──────

  /** Citas solicitadas al proveedor (filtro opcional ?status=). */
  @Get('provider/mine')
  listForProvider(
    @Request() req: AuthenticatedRequest,
    @Query('status') status?: string,
  ) {
    return this.appointments.listForProvider(req.user.userId, status);
  }

  /** Historial completo de citas del proveedor. */
  @Get('provider/history')
  providerHistory(@Request() req: AuthenticatedRequest) {
    return this.appointments.providerHistory(req.user.userId);
  }

  /** Configura el horario semanal de la agenda. */
  @Put('provider/schedule')
  setSchedule(
    @Request() req: AuthenticatedRequest,
    @Body() body: SetScheduleDto,
  ) {
    return this.appointments.setSchedule(req.user.userId, body.schedule);
  }

  /** Obtiene el horario semanal configurado. */
  @Get('provider/schedule')
  getSchedule(@Request() req: AuthenticatedRequest) {
    return this.appointments.getSchedule(req.user.userId);
  }

  /** Horarios disponibles del proveedor para un día (cliente). */
  @Get('provider/:providerId/slots')
  getSlots(
    @Param('providerId', ParseIntPipe) providerId: number,
    @Query('date') date: string,
  ) {
    return this.appointments.getSlots(providerId, date);
  }

  // ── CLIENTE ────────────────────────────────────────────────

  /** Crea una cita. */
  @Post()
  create(
    @Request() req: AuthenticatedRequest,
    @Body() body: CreateAppointmentDto,
  ) {
    return this.appointments.create(req.user.userId, body);
  }

  /** Citas del usuario autenticado (como cliente). */
  @Get('mine')
  listMine(@Request() req: AuthenticatedRequest) {
    return this.appointments.listMine(req.user.userId);
  }

  // ── ACCIONES SOBRE UNA CITA (:id) ──────────────────────────

  /** Cancela una cita (solo el cliente que la creó). */
  @Patch(':id/cancel')
  cancel(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.appointments.cancel(req.user.userId, id);
  }

  /** Confirma una cita (solo el proveedor dueño). */
  @Patch(':id/confirm')
  confirm(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.appointments.confirm(req.user.userId, id);
  }

  /** Rechaza una cita (solo el proveedor dueño). */
  @Patch(':id/reject')
  reject(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: RejectAppointmentDto,
  ) {
    return this.appointments.reject(req.user.userId, id, body.reason);
  }

  /** Marca una cita como completada (solo el proveedor dueño). */
  @Patch(':id/complete')
  complete(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.appointments.complete(req.user.userId, id);
  }
}
