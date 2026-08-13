import {
  WhatsappPolicyService,
  normalizeText,
} from './whatsapp-policy.service.js';
import { HUMAN_HANDOVER_REPLY, OUT_OF_SCOPE_REPLY } from './whatsapp-faq.js';

describe('normalizeText', () => {
  it('quita acentos, baja a minúsculas y colapsa espacios', () => {
    expect(normalizeText('  ¿CÓMO   me  Registró? ')).toBe(
      '¿como me registro?',
    );
  });
});

describe('WhatsappPolicyService', () => {
  const policy = new WhatsappPolicyService();

  it('STOP → opt_out (sin respuesta)', () => {
    for (const t of [
      'STOP',
      'detener',
      'no quiero recibir mensajes',
      'quiero darme de baja',
    ]) {
      expect(policy.decide(t)).toEqual({ kind: 'opt_out' });
    }
  });

  it('no confunde una preferencia de producto con opt-out', () => {
    expect(policy.decide('no quiero el plan premium')).not.toEqual({
      kind: 'opt_out',
    });
  });

  it('HUMANO/ASESOR/PERSONA → handover con una confirmación', () => {
    for (const t of ['humano', 'quiero un asesor', 'una persona por favor']) {
      expect(policy.decide(t)).toEqual({
        kind: 'handover',
        reply: HUMAN_HANDOVER_REPLY,
      });
    }
  });

  it('opt_out tiene prioridad sobre handover', () => {
    expect(policy.decide('stop, no quiero hablar con un humano')).toEqual({
      kind: 'opt_out',
    });
  });

  it('STOP y HUMANO tienen prioridad sobre VINCULAR', () => {
    expect(policy.decide('STOP VINCULAR ABCDEFGHJK')).toEqual({
      kind: 'opt_out',
    });
    expect(policy.decide('humano VINCULAR ABCDEFGHJK')).toEqual({
      kind: 'handover',
      reply: HUMAN_HANDOVER_REPLY,
    });
  });

  it('solo acepta el comando exacto de vínculo', () => {
    expect(policy.decide('VINCULAR ABCDEFGHJK')).toEqual({
      kind: 'link',
      code: 'ABCDEFGHJK',
    });
    expect(policy.decide('por favor VINCULAR ABCDEFGHJK').kind).toBe('reject');
    expect(policy.decide('VINCULAR ABCDEFGHJK gracias').kind).toBe('reject');
  });

  it('FAQ de Servi → respuesta pública', () => {
    const cases: [string, string][] = [
      ['¿cómo me registro?', 'registr'],
      ['cuánto cuesta el plan premium', 'plan'],
      ['quiero ser proveedor', 'proveedor'],
      ['ayuda no puedo entrar', 'ayuda'],
    ];
    for (const [text] of cases) {
      const d = policy.decide(text);
      expect(d.kind).toBe('faq');
      expect((d as { reply: string }).reply.length).toBeGreaterThan(0);
    }
  });

  it('fuera de alcance de Servi → rechazo corto', () => {
    expect(policy.decide('cuánto cuesta un iphone en estados unidos')).toEqual({
      kind: 'reject',
      reply: OUT_OF_SCOPE_REPLY,
    });
  });
});
