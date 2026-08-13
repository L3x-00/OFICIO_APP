import { createHmac } from 'node:crypto';
import {
  hashContact,
  hashInboundMessageId,
  hashLinkCode,
  verifyOpenWaSignature,
} from './whatsapp-signature.js';

const SECRET = 'test-webhook-secret';

function sign(body: Buffer | string, secret = SECRET): string {
  const buf = typeof body === 'string' ? Buffer.from(body) : body;
  return `sha256=${createHmac('sha256', secret).update(buf).digest('hex')}`;
}

describe('verifyOpenWaSignature', () => {
  const body = Buffer.from(JSON.stringify({ event: 'message.received' }));

  it('acepta una firma válida sobre el cuerpo crudo', () => {
    expect(verifyOpenWaSignature(body, sign(body), SECRET)).toBe(true);
  });

  it('rechaza una firma con secreto distinto', () => {
    expect(verifyOpenWaSignature(body, sign(body, 'otro'), SECRET)).toBe(false);
  });

  it('rechaza si el cuerpo cambió (firma no cubre estos bytes)', () => {
    const other = Buffer.from(JSON.stringify({ event: 'x' }));
    expect(verifyOpenWaSignature(other, sign(body), SECRET)).toBe(false);
  });

  it('rechaza firma ausente', () => {
    expect(verifyOpenWaSignature(body, undefined, SECRET)).toBe(false);
  });

  it('rechaza sin el prefijo sha256=', () => {
    const hex = createHmac('sha256', SECRET).update(body).digest('hex');
    expect(verifyOpenWaSignature(body, hex, SECRET)).toBe(false);
  });

  it('rechaza hex de longitud inválida', () => {
    expect(verifyOpenWaSignature(body, 'sha256=deadbeef', SECRET)).toBe(false);
  });

  it('rechaza cuerpo vacío', () => {
    expect(verifyOpenWaSignature(Buffer.alloc(0), sign(body), SECRET)).toBe(
      false,
    );
  });

  it('rechaza secreto vacío', () => {
    expect(verifyOpenWaSignature(body, sign(body), '')).toBe(false);
  });
});

describe('hashContact', () => {
  it('es determinista para el mismo teléfono + secreto', () => {
    expect(hashContact('51999@c.us', 'k')).toBe(hashContact('51999@c.us', 'k'));
  });

  it('cambia con el secreto (no es un hash simple)', () => {
    expect(hashContact('51999@c.us', 'k1')).not.toBe(
      hashContact('51999@c.us', 'k2'),
    );
  });

  it('no contiene el teléfono en claro', () => {
    expect(hashContact('51999888777@c.us', 'k')).not.toContain('51999888777');
  });

  it('protege messageId aunque contenga el JID del contacto', () => {
    const value = hashInboundMessageId('true_51999888777@c.us_ABCDEF', 'k');
    expect(value).not.toContain('51999888777');
    expect(value).not.toBe(hashContact('true_51999888777@c.us_ABCDEF', 'k'));
  });

  it('separa el HMAC de código del HMAC de contacto', () => {
    const codeHash = hashLinkCode('session', 'ABCDEFGHJK', 'k');
    expect(codeHash).not.toContain('ABCDEFGHJK');
    expect(codeHash).not.toBe(hashContact('ABCDEFGHJK', 'k'));
  });
});
