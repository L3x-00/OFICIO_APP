import { createHmac, timingSafeEqual } from 'node:crypto';

const SIGNATURE_PREFIX = 'sha256=';

/**
 * Verifica la firma HMAC-SHA256 de un webhook OpenWA sobre el CUERPO CRUDO.
 *
 * Contrato OpenWA (D:\OpenWA-Service `webhook.service.ts#generateSignature`):
 *   header `x-openwa-signature: sha256=<hex>`
 *   hex = HMAC_SHA256(secret, rawBodyBytes)
 *
 * - Compara en tiempo constante (timingSafeEqual sobre digests de 32 bytes).
 * - Exige exactamente el formato `sha256=<hex>`; cualquier otra cosa → false.
 * - Firma ausente/malformada/secreto vacío → false (el caller responde 401).
 */
export function verifyOpenWaSignature(
  rawBody: Buffer | undefined,
  signatureHeader: string | undefined,
  secret: string,
): boolean {
  if (!rawBody || rawBody.length === 0) return false;
  if (!secret) return false;
  if (!signatureHeader || typeof signatureHeader !== 'string') return false;
  if (!signatureHeader.startsWith(SIGNATURE_PREFIX)) return false;

  const providedHex = signatureHeader.slice(SIGNATURE_PREFIX.length);
  // Hex de 64 chars (32 bytes). Un hex de longitud distinta o inválido no puede
  // ser una firma SHA-256 válida.
  if (!/^[0-9a-f]{64}$/i.test(providedHex)) return false;

  const expected = createHmac('sha256', secret).update(rawBody).digest();
  const provided = Buffer.from(providedHex, 'hex');
  if (provided.length !== expected.length) return false;

  return timingSafeEqual(provided, expected);
}

/**
 * HMAC-SHA256 del identificador del contacto (teléfono/JID) con un secreto
 * LOCAL. Nunca se persiste el teléfono en claro: solo este hash. No es un hash
 * simple (sin clave) para que no se pueda revertir por diccionario de números.
 */
export function hashContact(identifier: string, secret: string): string {
  return hashOpaqueIdentifier('contact\0', identifier, secret);
}

/**
 * Identificador opaco de un inbound para la clave de idempotencia. Algunos
 * proveedores incorporan el JID/número dentro de `messageId`; por eso tampoco
 * se persiste en claro. El HMAC conserva la igualdad necesaria para deduplicar.
 */
export function hashInboundMessageId(
  messageId: string,
  secret: string,
): string {
  return hashOpaqueIdentifier('message-id\0', messageId, secret);
}

function hashOpaqueIdentifier(
  domain: string,
  identifier: string,
  secret: string,
): string {
  return createHmac('sha256', secret)
    .update(domain)
    .update(identifier)
    .digest('hex');
}
