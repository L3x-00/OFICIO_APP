import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpException,
  HttpStatus,
  Post,
  Request,
  ServiceUnavailableException,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt.guard.js';
import { AiAssistantService } from './ai-assistant.service.js';
import { AiFeatureFlagService } from './ai-feature-flag.service.js';
import { AskAiDto } from './dto/ask-ai.dto.js';
import { SandboxAiDto } from './dto/sandbox-ai.dto.js';
import type {
  AiCaller,
  AiUserRole,
  AiChatResult,
} from './ai-assistant.types.js';

/**
 * Endpoint público de "Ofi". Aislado bajo /ai-assistant.
 *
 * Defensas en orden:
 *   1. JwtAuthGuard — solo usuarios autenticados.
 *   2. Throttle 10/min — anti-abuso a nivel HTTP (independiente de los
 *      límites diarios del servicio).
 *   3. Feature flags — si la IA está apagada para el rol, 403 controlado.
 *   4. Control de costos DUAL (Fase 5) — presupuesto global + límite por
 *      usuario, validados ANTES de procesar (429 si se exceden).
 *
 * El `caller` se arma SIEMPRE desde el JWT (`req.user`), nunca del body —
 * anti-IDOR (RNF-SEG-04).
 */
@Controller('ai-assistant')
@UseGuards(JwtAuthGuard)
export class AiAssistantController {
  constructor(
    private readonly service: AiAssistantService,
    private readonly flags: AiFeatureFlagService,
    private readonly config: ConfigService,
  ) {}

  @Post('chat')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async chat(
    @Request() req: any,
    @Body() dto: AskAiDto,
  ): Promise<AiChatResult> {
    const role = (req.user?.role as AiUserRole) ?? 'USUARIO';

    // Feature flag por rol — master switch + segmento. Si está apagada,
    // 403 (no 200 con texto) para que el cliente oculte la UI de la IA.
    if (!this.flags.isEnabledForRole(role)) {
      throw new ForbiddenException('El asistente no está disponible.');
    }

    // Control de costos DUAL (Fase 5) — se validan AMBOS límites antes de
    // procesar. Global primero (protege el presupuesto de la plataforma);
    // los ADMIN están exentos del global. 429 si se excede cualquiera.
    const global = await this.service.checkGlobalLimit(role);
    if (!global.allowed) {
      throw new HttpException(
        'El asistente alcanzó su capacidad diaria. Vuelve mañana.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const daily = await this.service.checkDailyLimit(req.user.userId, role);
    if (!daily.allowed) {
      throw new HttpException(
        'Alcanzaste tu límite diario de consultas al asistente. Vuelve mañana.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const caller: AiCaller = {
      userId: req.user.userId,
      role,
      providerType: dto.providerType ?? null,
    };

    // Metadata del request para auditoría (Fase 4) — IP + User-Agent.
    const reqMeta = {
      ip: req.ip ?? req.socket?.remoteAddress,
      userAgent: req.headers?.['user-agent'],
    };

    const result = await this.service.chat(
      caller,
      dto.message,
      dto.history ?? [],
      reqMeta,
    );

    // Si el servicio bloqueó por circuito abierto, exponemos 503 para que
    // el cliente sepa reintentar luego (el resto de bloqueos van 200 con
    // el motivo en meta, porque son respuestas "normales" para el user).
    if (result.meta.blocked && result.meta.reason === 'circuit') {
      throw new ServiceUnavailableException(result.reply);
    }

    return result;
  }

  /**
   * Historial reciente del usuario autenticado (últimos 20 mensajes) para
   * sincronizar el chat entre dispositivos. Protegido por JwtAuthGuard
   * (a nivel de clase). El userId SIEMPRE sale del JWT — nunca del cliente.
   */
  @Get('history')
  async history(@Request() req: any): Promise<{
    messages: Array<{ role: string; content: string; createdAt: Date }>;
  }> {
    const messages = await this.service.getHistory(req.user.userId, 20);
    return { messages };
  }

  /**
   * Sandbox de pruebas (Fase 5). SOLO ADMIN + header `X-Test-Secret`.
   *
   * Ejecuta el flujo COMPLETO simulando `simulateRole`, pero NO persiste
   * en BD ni consume cuota de límites (sandbox=true). Útil para validar
   * prompts/tools sin contaminar datos ni gastar presupuesto del día.
   */
  @Post('test')
  async test(
    @Request() req: any,
    @Headers('x-test-secret') secret: string | undefined,
    @Body() dto: SandboxAiDto,
  ): Promise<AiChatResult> {
    // 1. Rol ADMIN obligatorio.
    const role = req.user?.role as AiUserRole;
    if (role !== 'ADMIN') {
      throw new ForbiddenException('Endpoint de pruebas: solo ADMIN.');
    }

    // 2. Secreto de pruebas obligatorio y correcto.
    const expected = this.config.get<string>('AI_TEST_SECRET');
    if (!expected || !secret || secret !== expected) {
      throw new UnauthorizedException('X-Test-Secret inválido.');
    }

    // 3. Caller con el rol SIMULADO (userId real del admin, del JWT).
    const simulated = (dto.simulateRole as AiUserRole) ?? 'USUARIO';
    const caller: AiCaller = {
      userId: req.user.userId,
      role: simulated,
      providerType: null,
    };

    // Flujo completo en modo sandbox: sin persistencia ni consumo de cuota.
    return this.service.chat(caller, dto.message, [], {}, { sandbox: true });
  }
}
