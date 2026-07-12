import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ProviderFeaturesService } from '../common/provider-features.service.js';
import { PushNotificationsService } from '../firebase/push-notifications.service.js';
import type { CreateAppointmentDto } from './dto/create-appointment.dto.js';

const ACTIVE_STATUSES = ['PENDIENTE', 'CONFIRMADA'];
const PERU_TZ = 'America/Lima';
const DAY_MS = 24 * 60 * 60 * 1000;
const PERU_OFFSET_MS = 5 * 60 * 60 * 1000; // UTC-5, Perú no tiene DST
const WEEKDAY_KEYS = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab'];
const SLOT_MINUTES = 30;

/**
 * Agenda de Citas. Solo proveedores con el feature "agenda" (resuelto vía
 * [[ProviderFeaturesService]]). Límites de citas activas/mes por plan:
 * GRATIS=1, ESTANDAR=20, PREMIUM=ilimitado. Notifica por push.
 */
@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly features: ProviderFeaturesService,
    private readonly push: PushNotificationsService,
  ) {}

  // ── CLIENTE ────────────────────────────────────────────────

  /** Horarios disponibles (bloques de 30 min) del proveedor para un día. */
  async getSlots(providerId: number, dateStr: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      throw new BadRequestException('Formato de fecha inválido (YYYY-MM-DD).');
    }
    await this.features.assertProviderHasFeature(providerId, 'agenda');

    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
      select: { appointmentSchedule: true },
    });
    if (!provider) throw new NotFoundException('Proveedor no encontrado.');

    const schedule = this.asSchedule(provider.appointmentSchedule);
    const key = this.peruWeekdayKey(dateStr);
    const ranges = typeof schedule[key] === 'string' ? schedule[key] : '';
    if (!ranges.trim()) return { date: dateStr, slots: [] };

    const all = this.generateSlots(dateStr, ranges);

    // Excluir los horarios ya tomados (citas activas) de ese día.
    const dayStart = new Date(`${dateStr}T00:00:00-05:00`);
    const dayEnd = new Date(`${dateStr}T23:59:59-05:00`);
    const taken = await this.prisma.appointment.findMany({
      where: {
        providerId,
        date: { gte: dayStart, lte: dayEnd },
        status: { in: ACTIVE_STATUSES },
      },
      select: { date: true },
    });
    const takenTimes = new Set(
      taken.map((t) => this.peruHHMM(new Date(t.date))),
    );

    return {
      date: dateStr,
      slots: all.filter((s) => !takenTimes.has(s.time)),
    };
  }

  /** Crea una cita (status PENDIENTE). Aplica feature-gate + límite de plan. */
  async create(userId: number, dto: CreateAppointmentDto) {
    const provider = await this.prisma.provider.findUnique({
      where: { id: dto.providerId },
      select: { id: true, userId: true, businessName: true },
    });
    if (!provider) throw new NotFoundException('Proveedor no encontrado.');

    await this.features.assertProviderHasFeature(provider.id, 'agenda');

    // Límite de citas ACTIVAS creadas este mes según el plan del proveedor.
    const plan = await this.getPlan(provider.id);
    const limit = this.monthlyActiveLimit(plan);
    if (Number.isFinite(limit)) {
      const used = await this.prisma.appointment.count({
        where: {
          providerId: provider.id,
          status: { in: ACTIVE_STATUSES },
          createdAt: { gte: this.startOfPeruMonthUtc() },
        },
      });
      if (used >= limit) {
        throw new HttpException(
          'Actualiza a un plan Estándar o Premium para agendar más citas',
          HttpStatus.PAYMENT_REQUIRED, // 402
        );
      }
    }

    const date = new Date(dto.date);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Fecha de la cita inválida.');
    }
    if (date.getTime() < Date.now()) {
      throw new BadRequestException('No puedes agendar una cita en el pasado.');
    }

    // Anti doble-reserva: no dos citas activas en el mismo instante.
    const clash = await this.prisma.appointment.findFirst({
      where: { providerId: provider.id, date, status: { in: ACTIVE_STATUSES } },
      select: { id: true },
    });
    if (clash) throw new ConflictException('Ese horario ya está reservado.');

    const appt = await this.prisma.appointment.create({
      data: {
        providerId: provider.id,
        userId,
        date,
        description: dto.description?.trim() || null,
      },
    });

    const when = this.fmtDateTime(date);
    this.notify(
      userId,
      'Cita solicitada',
      `Tu cita con ${provider.businessName} para el ${when} está pendiente de confirmación.`,
      { type: 'APPOINTMENT_CREATED', appointmentId: String(appt.id) },
    );
    this.notify(
      provider.userId,
      'Nueva solicitud de cita',
      `Tienes una nueva solicitud de cita para el ${when}.`,
      { type: 'APPOINTMENT_REQUEST', appointmentId: String(appt.id) },
    );
    return appt;
  }

  /** Citas del usuario autenticado (como cliente). */
  listMine(userId: number) {
    return this.prisma.appointment.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      include: {
        provider: { select: { id: true, businessName: true, type: true } },
      },
    });
  }

  /** Cancela una cita — solo el cliente que la creó. */
  async cancel(userId: number, id: number) {
    const appt = await this.prisma.appointment.findUnique({ where: { id } });
    if (!appt) throw new NotFoundException('Cita no encontrada.');
    if (appt.userId !== userId) {
      throw new ForbiddenException('Esta cita no es tuya.');
    }
    if (!ACTIVE_STATUSES.includes(appt.status)) {
      throw new BadRequestException('Esta cita ya no se puede cancelar.');
    }
    return this.prisma.appointment.update({
      where: { id },
      data: { status: 'CANCELADA' },
    });
  }

  // ── PROVEEDOR ──────────────────────────────────────────────

  /** Citas solicitadas al proveedor (filtro opcional por status). */
  async listForProvider(userId: number, status?: string) {
    const ids = await this.ownedProviderIds(userId);
    return this.prisma.appointment.findMany({
      where: { providerId: { in: ids }, ...(status ? { status } : {}) },
      orderBy: { date: 'asc' },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, phone: true },
        },
      },
    });
  }

  /** Historial completo (cualquier estado) de las citas del proveedor. */
  async providerHistory(userId: number) {
    const ids = await this.ownedProviderIds(userId);
    return this.prisma.appointment.findMany({
      where: { providerId: { in: ids } },
      orderBy: { date: 'desc' },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  /** Confirma una cita pendiente — solo el proveedor dueño. */
  async confirm(userId: number, id: number) {
    const appt = await this.assertProviderOwns(userId, id);
    if (appt.status !== 'PENDIENTE') {
      throw new BadRequestException('Solo se confirman citas pendientes.');
    }
    const updated = await this.prisma.appointment.update({
      where: { id },
      data: { status: 'CONFIRMADA' },
    });
    this.notify(
      appt.userId,
      'Cita confirmada',
      `Tu cita con ${appt.provider.businessName} para el ${this.fmtDateTime(appt.date)} ha sido confirmada.`,
      { type: 'APPOINTMENT_CONFIRMED', appointmentId: String(id) },
    );
    return updated;
  }

  /** Rechaza una cita — solo el proveedor dueño. */
  async reject(userId: number, id: number, reason?: string) {
    const appt = await this.assertProviderOwns(userId, id);
    if (!ACTIVE_STATUSES.includes(appt.status)) {
      throw new BadRequestException('Esta cita ya no se puede rechazar.');
    }
    const updated = await this.prisma.appointment.update({
      where: { id },
      data: { status: 'RECHAZADA' },
    });
    const extra = reason?.trim() ? ` Motivo: ${reason.trim()}` : '';
    this.notify(
      appt.userId,
      'Cita rechazada',
      `Tu cita con ${appt.provider.businessName} para el ${this.fmtDateTime(appt.date)} ha sido rechazada.${extra}`,
      { type: 'APPOINTMENT_REJECTED', appointmentId: String(id) },
    );
    return updated;
  }

  /** Marca una cita confirmada como completada — solo el proveedor dueño. */
  async complete(userId: number, id: number) {
    const appt = await this.assertProviderOwns(userId, id);
    if (appt.status !== 'CONFIRMADA') {
      throw new BadRequestException('Solo se completan citas confirmadas.');
    }
    return this.prisma.appointment.update({
      where: { id },
      data: { status: 'COMPLETADA' },
    });
  }

  /** Configura el horario semanal de la agenda — solo el proveedor dueño. */
  async setSchedule(userId: number, schedule: Record<string, string>) {
    const provider = await this.resolveOwnedProvider(userId);
    await this.features.assertProviderHasFeature(provider.id, 'agenda');

    const clean: Record<string, string> = {};
    for (const [k, v] of Object.entries(schedule ?? {})) {
      if (WEEKDAY_KEYS.includes(k) && k !== 'dom' && typeof v === 'string') {
        clean[k] = v.trim();
      } else if (k === 'dom' && typeof v === 'string') {
        clean[k] = v.trim();
      }
    }

    // Límite de días activos por plan (GRATIS=1, ESTANDAR=3, PREMIUM=7).
    const plan = await this.getPlan(provider.id);
    const maxDays = this.scheduleDayLimit(plan);
    const activeDays = Object.values(clean).filter((v) =>
      this.isOpenDay(v),
    ).length;
    if (activeDays > maxDays) {
      throw new HttpException(
        `Tu plan permite abrir la agenda ${maxDays} día(s) por semana. Actualiza para habilitar más días.`,
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    await this.prisma.provider.update({
      where: { id: provider.id },
      data: { appointmentSchedule: clean },
    });
    return { schedule: clean, maxDays };
  }

  /** Obtiene el horario semanal configurado + el tope de días del plan. */
  async getSchedule(userId: number) {
    const provider = await this.resolveOwnedProvider(userId);
    const plan = await this.getPlan(provider.id);
    return {
      schedule: this.asSchedule(provider.appointmentSchedule),
      maxDays: this.scheduleDayLimit(plan),
    };
  }

  // ── CRON: recordatorio 24h antes (idempotente vía reminderSentAt) ──
  @Cron('0 9 * * *', { timeZone: PERU_TZ })
  async sendDayBeforeReminders(): Promise<void> {
    if (process.env.FEATURE_AGENDA !== 'true') return;

    try {
      const startTomorrow = new Date(this.startOfPeruDayUtc() + DAY_MS);
      const endTomorrow = new Date(this.startOfPeruDayUtc() + 2 * DAY_MS);
      const due = await this.prisma.appointment.findMany({
        where: {
          status: 'CONFIRMADA',
          reminderSentAt: null,
          date: { gte: startTomorrow, lt: endTomorrow },
        },
        include: { provider: { select: { businessName: true } } },
        take: 500,
      });
      for (const a of due) {
        this.notify(
          a.userId,
          'Recordatorio de cita',
          `Recuerda tu cita de mañana con ${a.provider.businessName} a las ${this.peruHHMM(new Date(a.date))}.`,
          { type: 'APPOINTMENT_REMINDER', appointmentId: String(a.id) },
        );
        await this.prisma.appointment.update({
          where: { id: a.id },
          data: { reminderSentAt: new Date() },
        });
      }
      if (due.length) {
        this.logger.log(`[AGENDA] ${due.length} recordatorios enviados.`);
      }
    } catch (e) {
      this.logger.warn(
        `sendDayBeforeReminders falló: ${(e as Error)?.message ?? e}`,
      );
    }
  }

  // ── Helpers ────────────────────────────────────────────────

  private notify(
    userId: number,
    title: string,
    body: string,
    data: Record<string, string>,
  ): void {
    // Fire-and-forget: un fallo de push NO debe romper la operación.
    void this.push.sendToUser(userId, title, body, data).catch(() => undefined);
  }

  private async assertProviderOwns(userId: number, appointmentId: number) {
    const appt = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { provider: { select: { userId: true, businessName: true } } },
    });
    if (!appt) throw new NotFoundException('Cita no encontrada.');
    if (appt.provider.userId !== userId) {
      throw new ForbiddenException('No eres el proveedor de esta cita.');
    }
    return appt;
  }

  private async resolveOwnedProvider(userId: number) {
    const p = await this.prisma.provider.findFirst({
      where: { userId },
      orderBy: { id: 'asc' },
    });
    if (!p) throw new NotFoundException('No tienes un perfil de proveedor.');
    return p;
  }

  private async ownedProviderIds(userId: number): Promise<number[]> {
    const ps = await this.prisma.provider.findMany({
      where: { userId },
      select: { id: true },
    });
    if (!ps.length) {
      throw new NotFoundException('No tienes un perfil de proveedor.');
    }
    return ps.map((p) => p.id);
  }

  private async getPlan(providerId: number): Promise<string> {
    const sub = await this.prisma.subscription.findFirst({
      where: { providerId },
      select: { plan: true },
    });
    return sub?.plan ?? 'GRATIS';
  }

  private monthlyActiveLimit(plan: string): number {
    if (plan === 'PREMIUM') return Infinity;
    if (plan === 'ESTANDAR') return 20;
    return 1; // GRATIS / sin suscripción
  }

  /** Días activos por semana que el proveedor puede abrir según su plan. */
  private scheduleDayLimit(plan: string): number {
    if (plan === 'PREMIUM') return 7; // semana completa
    if (plan === 'ESTANDAR') return 3;
    return 1; // GRATIS / sin suscripción
  }

  /** Un día está "abierto" si tiene un rango horario (no vacío ni "Cerrado"). */
  private isOpenDay(value: string): boolean {
    const v = value.trim().toLowerCase();
    return v !== '' && v !== 'cerrado';
  }

  private asSchedule(value: unknown): Record<string, string> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        if (typeof v === 'string') out[k] = v;
      }
      return out;
    }
    return {};
  }

  /** Día de la semana (lun..dom) de una fecha YYYY-MM-DD en horario de Perú. */
  private peruWeekdayKey(dateStr: string): string {
    const anchor = new Date(`${dateStr}T12:00:00-05:00`);
    return WEEKDAY_KEYS[anchor.getUTCDay()];
  }

  /** "HH:MM" (24h) de una fecha en horario de Perú. */
  private peruHHMM(d: Date): string {
    return d.toLocaleTimeString('en-GB', {
      timeZone: PERU_TZ,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  /** Fecha + hora legible (es-PE, tz Perú) para los mensajes de notificación. */
  private fmtDateTime(d: Date): string {
    return d.toLocaleString('es-PE', {
      timeZone: PERU_TZ,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /** Genera bloques de 30 min para rangos "8:00-12:00,14:00-18:00". */
  private generateSlots(
    dateStr: string,
    ranges: string,
  ): Array<{ time: string; iso: string }> {
    const out: Array<{ time: string; iso: string }> = [];
    for (const part of ranges.split(',')) {
      const [startRaw, endRaw] = part.split('-');
      if (!startRaw || !endRaw) continue;
      const [sh, sm] = startRaw.trim().split(':').map(Number);
      const [eh, em] = endRaw.trim().split(':').map(Number);
      if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) continue;
      let mins = sh * 60 + sm;
      const endMins = eh * 60 + em;
      while (mins < endMins) {
        const hh = String(Math.floor(mins / 60)).padStart(2, '0');
        const mm = String(mins % 60).padStart(2, '0');
        out.push({
          time: `${hh}:${mm}`,
          iso: `${dateStr}T${hh}:${mm}:00-05:00`,
        });
        mins += SLOT_MINUTES;
      }
    }
    return out;
  }

  /** Instante UTC del inicio del día actual en Perú (UTC-5). */
  private startOfPeruDayUtc(): number {
    return (
      Math.floor((Date.now() - PERU_OFFSET_MS) / DAY_MS) * DAY_MS +
      PERU_OFFSET_MS
    );
  }

  /** Inicio del mes actual en Perú, como Date UTC. */
  private startOfPeruMonthUtc(): Date {
    const nowPeru = new Date(Date.now() - PERU_OFFSET_MS);
    const y = nowPeru.getUTCFullYear();
    const m = nowPeru.getUTCMonth();
    return new Date(Date.UTC(y, m, 1) + PERU_OFFSET_MS);
  }
}
