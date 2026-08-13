import {
  Controller,
  Delete,
  Get,
  Headers,
  Optional,
  Post,
  Req,
  Res,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt.guard.js';
import type { AuthenticatedRequest } from '../common/interfaces/auth-request.js';
import { WhatsappLinkService } from './whatsapp-link.service.js';
import { WhatsappAssistantService } from './whatsapp-assistant.service.js';

/**
 * Webhook PRIVADO de OpenWA → Servi (F1). NO usa JwtAuthGuard: la autenticación
 * es EXCLUSIVAMENTE por HMAC-SHA256 sobre el cuerpo HTTP crudo
 * (`x-openwa-signature: sha256=<hex>`), verificado en el service con
 * comparación de tiempo constante.
 *
 * Requiere `rawBody: true` en `NestFactory.create` (ver main.ts) para que
 * `req.rawBody` contenga los bytes exactos que la firma cubre.
 *
 * Códigos: 401 firma ausente/ inválida · 204 flag off / fuera de alcance /
 * suprimido / duplicado · 200 procesado con salida.
 *
 * Se usa la respuesta nativa (`@Res()`) y `res.status(...).send()` para fijar el
 * código de forma inequívoca (200 vs 204). Un `UnauthorizedException` lanzado en
 * el service se propaga ANTES de tocar `res`, así que el filtro global responde
 * el 401 normalmente.
 */
@Controller('whatsapp-assistant')
export class WhatsappAssistantController {
  constructor(
    private readonly service: WhatsappAssistantService,
    @Optional() private readonly links?: WhatsappLinkService,
  ) {}

  @Post('webhook')
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-openwa-signature') signature: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const outcome = await this.service.handleWebhook(req.rawBody, signature);
    res.status(outcome.status).send();
  }

  /** F3: el código nace solo desde la cuenta autenticada, nunca WhatsApp. */
  @Post('link-code')
  @UseGuards(JwtAuthGuard)
  async createLinkCode(@Req() req: AuthenticatedRequest) {
    const challenge = await this.links?.createLinkCode(req.user.userId);
    if (!challenge) {
      throw new ServiceUnavailableException(
        'El vínculo de WhatsApp no está disponible.',
      );
    }
    return {
      code: challenge.code,
      expiresAt: challenge.expiresAt,
      instruction: `Escribe VINCULAR ${challenge.code} en el WhatsApp oficial de Servi.`,
    };
  }

  /** Estado opaco: no devuelve teléfono, JID, hash ni datos de cuenta. */
  @Get('link')
  @UseGuards(JwtAuthGuard)
  async linkStatus(@Req() req: AuthenticatedRequest) {
    const linked = (await this.links?.isLinked(req.user.userId)) ?? false;
    return { linked };
  }

  /** La cuenta autenticada puede quitar únicamente su propio vínculo. */
  @Delete('link')
  @UseGuards(JwtAuthGuard)
  async unlink(@Req() req: AuthenticatedRequest) {
    const ok = (await this.links?.unlink(req.user.userId)) ?? false;
    return { ok };
  }
}
