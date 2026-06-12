import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service.js';
import { EmailService } from './email.service.js';

/**
 * Re-enganche de usuarios inactivos. Una vez al día busca usuarios con
 * `lastLoginAt` > 30 días y les envía el correo "Te extrañamos". Para no
 * spammear, marca `inactivityEmailSentAt`; solo se vuelve a enviar si el
 * usuario reactiva (login) y vuelve a quedar inactivo.
 */
@Injectable()
export class EmailRetentionService {
  private readonly logger = new Logger(EmailRetentionService.name);
  private static readonly INACTIVE_DAYS = 30;
  private static readonly BATCH = 100;

  constructor(
    private prisma: PrismaService,
    private email: EmailService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_10AM)
  async sendInactivityEmails(): Promise<void> {
    const threshold = new Date(
      Date.now() - EmailRetentionService.INACTIVE_DAYS * 24 * 60 * 60 * 1000,
    );

    // Inactivos desde antes del umbral, activos, NO eliminados, a los que no
    // se les ha enviado el correo desde su última actividad.
    const users = await this.prisma.user.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        lastLoginAt: { lt: threshold },
        OR: [
          { inactivityEmailSentAt: null },
          {
            inactivityEmailSentAt: { lt: this.prisma.user.fields.lastLoginAt },
          },
        ],
      },
      select: { id: true, email: true, firstName: true },
      take: EmailRetentionService.BATCH,
    });

    if (users.length === 0) return;

    let sent = 0;
    for (const u of users) {
      const ok = await this.email.sendInactivityEmail(u.email, u.firstName);
      if (ok) {
        sent++;
        await this.prisma.user
          .update({
            where: { id: u.id },
            data: { inactivityEmailSentAt: new Date() },
          })
          .catch(() => {});
      }
    }
    this.logger.log(
      `[inactivity-cron] ${sent}/${users.length} correos "Te extrañamos" enviados`,
    );
  }
}
