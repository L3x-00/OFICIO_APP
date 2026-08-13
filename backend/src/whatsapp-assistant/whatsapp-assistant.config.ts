import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Configuración + feature flag de la integración WhatsApp ↔ OpenWA (F1).
 *
 * Master switch: `WHATSAPP_ASSISTANT_ENABLED` (default FALSE). Apagado ⇒ el
 * endpoint de webhook es inerte (204, sin efectos, sin requerir secretos).
 *
 * Los secretos/URLs SOLO son obligatorios cuando el flag está encendido
 * (`assertEnabledConfig()`), para que un despliegue con el flag apagado no
 * requiera configurar nada.
 *
 * Convención de env (ver docs/INTEGRACION_OPENWA_SERVI.md):
 *   WHATSAPP_ASSISTANT_ENABLED=true|false
 *   OPENWA_BASE_URL=https://openwa.example.com
 *   OPENWA_API_KEY=...
 *   OPENWA_WEBHOOK_SECRET=...              (HMAC del webhook entrante)
 *   OPENWA_SERVI_SESSION_ID=...           (UUID de la sesión de Servi)
 *   WHATSAPP_ASSISTANT_CONTACT_HASH_SECRET=...  (HMAC local de identificadores)
 */
@Injectable()
export class WhatsappAssistantConfig {
  constructor(private readonly config: ConfigService) {}

  private str(key: string): string {
    return (this.config.get<string>(key) ?? '').trim();
  }

  private bool(key: string, fallback: boolean): boolean {
    const raw = this.config.get<string>(key);
    if (raw === undefined || raw === null || raw === '') return fallback;
    return raw.toLowerCase() === 'true' || raw === '1';
  }

  /** Master switch. Default FALSE (opt-in explícito). */
  get enabled(): boolean {
    return this.bool('WHATSAPP_ASSISTANT_ENABLED', false);
  }

  get baseUrl(): string {
    return this.str('OPENWA_BASE_URL');
  }

  get apiKey(): string {
    return this.str('OPENWA_API_KEY');
  }

  get webhookSecret(): string {
    return this.str('OPENWA_WEBHOOK_SECRET');
  }

  get sessionId(): string {
    return this.str('OPENWA_SERVI_SESSION_ID');
  }

  get contactHashSecret(): string {
    return this.str('WHATSAPP_ASSISTANT_CONTACT_HASH_SECRET');
  }

  private get isProd(): boolean {
    return (this.config.get<string>('NODE_ENV') ?? '') === 'production';
  }

  /**
   * Valida `OPENWA_BASE_URL`: debe ser http(s). HTTP solo se permite fuera de
   * producción (en prod exige https para no enviar la API key en claro).
   * Devuelve el origin normalizado sin barra final.
   */
  private validateBaseUrl(raw: string): string {
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      throw new Error('OPENWA_BASE_URL inválida (no es una URL)');
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error('OPENWA_BASE_URL debe ser http(s)');
    }
    if (url.protocol === 'http:' && this.isProd) {
      throw new Error('OPENWA_BASE_URL no puede ser http en producción');
    }
    return raw.replace(/\/+$/, '');
  }

  /**
   * Asegura que TODA la configuración requerida esté presente y bien formada
   * cuando el flag está encendido. Lanza con mensaje sin secretos. Devuelve la
   * base URL normalizada (útil para el cliente OpenWA).
   */
  assertEnabledConfig(): string {
    const missing: string[] = [];
    if (!this.apiKey) missing.push('OPENWA_API_KEY');
    if (!this.webhookSecret) missing.push('OPENWA_WEBHOOK_SECRET');
    if (!this.sessionId) missing.push('OPENWA_SERVI_SESSION_ID');
    if (!this.contactHashSecret) {
      missing.push('WHATSAPP_ASSISTANT_CONTACT_HASH_SECRET');
    }
    if (!this.baseUrl) missing.push('OPENWA_BASE_URL');
    if (missing.length > 0) {
      throw new Error(
        `WhatsApp assistant habilitado pero faltan variables: ${missing.join(', ')}`,
      );
    }
    return this.validateBaseUrl(this.baseUrl);
  }
}
