import { NotFoundException } from '@nestjs/common';
import { FeatureFlag } from '../../src/common/feature-flag.guard.js';

/**
 * Kill-switch por env de features ocultas (subastas / offer-posts).
 * Contrato: SOLO 'true' literal habilita; cualquier otro valor (o la
 * ausencia de la variable) responde 404 — la feature "no existe".
 */
describe('FeatureFlag guard', () => {
  const KEY = 'FEATURE_TEST_SPEC';

  afterEach(() => {
    delete process.env[KEY];
  });

  // El guard ignora el ExecutionContext (lee solo process.env), pero la
  // firma del interface CanActivate lo exige — stub vacío.
  const ctx = {} as never;
  const canActivate = () => new (FeatureFlag(KEY))().canActivate(ctx);

  it('sin la env → NotFoundException (oculta por defecto)', () => {
    delete process.env[KEY];
    expect(canActivate).toThrow(NotFoundException);
  });

  it("env 'false' → NotFoundException", () => {
    process.env[KEY] = 'false';
    expect(canActivate).toThrow(NotFoundException);
  });

  it("valores no-literales ('TRUE', '1') NO habilitan", () => {
    process.env[KEY] = 'TRUE';
    expect(canActivate).toThrow(NotFoundException);
    process.env[KEY] = '1';
    expect(canActivate).toThrow(NotFoundException);
  });

  it("env 'true' → permite el acceso", () => {
    process.env[KEY] = 'true';
    expect(canActivate()).toBe(true);
  });
});
