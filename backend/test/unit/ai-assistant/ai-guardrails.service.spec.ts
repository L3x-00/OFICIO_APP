/**
 * UNIT — AiGuardrailsService (post-filtro PII de "Ofi").
 *
 * Testeamos que NUNCA se filtre PII (DNI/RUC/celular) en la respuesta,
 * independiente de lo que diga Gemini. Servicio puro → instanciación
 * directa. `apply()` devuelve { safe, redacted, toxic }.
 */
import { AiGuardrailsService } from '../../../src/ai-assistant/ai-guardrails.service.js';

describe('AiGuardrailsService (unit)', () => {
  let service: AiGuardrailsService;

  beforeEach(() => {
    service = new AiGuardrailsService();
  });

  it('Test 1: DNI (8 dígitos) → enmascarado a [DATO PRIVADO]', () => {
    const r = service.apply('Para validar usa el DNI 12345678 del titular.');
    expect(r.safe).toContain('[DATO PRIVADO]');
    expect(r.safe).not.toContain('12345678');
    expect(r.redacted).toBe(true);
    expect(r.toxic).toBe(false);
  });

  it('Test 2: RUC (11 díg) y celular (9 díg, empieza 9) → ambos enmascarados', () => {
    const r = service.apply('Empresa con RUC 20123456789, contáctalos al 987654321.');
    expect(r.safe).not.toContain('20123456789');
    expect(r.safe).not.toContain('987654321');
    expect(r.safe).toContain('[DATO PRIVADO]');
    expect(r.redacted).toBe(true);
    expect(r.toxic).toBe(false);
  });

  it('Test 3: respuesta limpia → texto intacto, redacted false', () => {
    const clean = 'El plan Premium cuesta S/ 39.90 al mes con más visibilidad.';
    const r = service.apply(clean);
    expect(r.safe).toBe(clean);
    expect(r.redacted).toBe(false);
    expect(r.toxic).toBe(false);
  });

  it('Test 4: toxicidad (insulto) → toxic true y respuesta neutra (no filtra el insulto)', () => {
    const r = service.apply('Eres un idiota y no sirves para nada.');
    expect(r.toxic).toBe(true);
    expect(r.safe).not.toContain('idiota');
    // Cuando es tóxica, el guardrail sustituye por el fallback ANTES de
    // redactar PII → redacted queda en false.
    expect(r.redacted).toBe(false);
  });

  it('Test 5: PII email → enmascarado a [DATO PRIVADO]', () => {
    const r = service.apply('Escríbele a soporte@serviapp.com para coordinar.');
    expect(r.safe).toContain('[DATO PRIVADO]');
    expect(r.safe).not.toContain('soporte@serviapp.com');
    expect(r.redacted).toBe(true);
    expect(r.toxic).toBe(false);
  });

  it('Test 6: PII UUID → enmascarado a [DATO PRIVADO]', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    const r = service.apply(`El identificador del ticket es ${uuid}.`);
    expect(r.safe).toContain('[DATO PRIVADO]');
    expect(r.safe).not.toContain(uuid);
    expect(r.redacted).toBe(true);
    expect(r.toxic).toBe(false);
  });

  it('Test 7: PII RUC (11 díg, empieza 10) → enmascarado a [DATO PRIVADO]', () => {
    const r = service.apply('La empresa tiene RUC 10456789012 registrado en SUNAT.');
    expect(r.safe).toContain('[DATO PRIVADO]');
    expect(r.safe).not.toContain('10456789012');
    expect(r.redacted).toBe(true);
    expect(r.toxic).toBe(false);
  });
});
