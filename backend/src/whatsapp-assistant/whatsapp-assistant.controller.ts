import { Controller, Headers, Post, Req, Res } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request, Response } from 'express';
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
  constructor(private readonly service: WhatsappAssistantService) {}

  @Post('webhook')
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-openwa-signature') signature: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const outcome = await this.service.handleWebhook(req.rawBody, signature);
    res.status(outcome.status).send();
  }
}
