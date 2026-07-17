import { GUARDS_METADATA } from '@nestjs/common/constants';
import { JwtAuthGuard } from '../../src/auth/jwt.guard.js';
import { ROLES_KEY } from '../../src/auth/roles.decorator.js';
import { RolesGuard } from '../../src/auth/roles.guard.js';
import { ProvidersController } from '../../src/providers/providers.controller.js';
import { ReviewsController } from '../../src/reviews/reviews.controller.js';

const guardsFor = (handler: (...args: any[]) => unknown) =>
  (Reflect.getMetadata(GUARDS_METADATA, handler) ?? []) as unknown[];

describe('public controller trust boundaries', () => {
  it.each(['getAdminMetrics', 'getGraceProviders'] as const)(
    'protects ProvidersController.%s with ADMIN role',
    (method) => {
      const handler = ProvidersController.prototype[method];
      expect(guardsFor(handler)).toEqual(
        expect.arrayContaining([JwtAuthGuard, RolesGuard]),
      );
      expect(Reflect.getMetadata(ROLES_KEY, handler)).toEqual(['ADMIN']);
    },
  );

  it.each([
    'addRecommendation',
    'createPlatformIssue',
    'createReport',
    'getRecommendationStatus',
    'toggleRecommendation',
  ] as const)('requires JWT for ProvidersController.%s', (method) => {
    expect(guardsFor(ProvidersController.prototype[method])).toContain(
      JwtAuthGuard,
    );
  });

  it.each(['findAll', 'moderate'] as const)(
    'protects ReviewsController.%s with ADMIN role',
    (method) => {
      const handler = ReviewsController.prototype[method];
      expect(guardsFor(handler)).toEqual(
        expect.arrayContaining([JwtAuthGuard, RolesGuard]),
      );
      expect(Reflect.getMetadata(ROLES_KEY, handler)).toEqual(['ADMIN']);
    },
  );

  it('uses JWT identity and ignores forged body/query user ids', () => {
    const providers = {
      addRecommendation: jest.fn(),
      createPlatformIssue: jest.fn(),
      createReport: jest.fn(),
      getRecommendationStatus: jest.fn(),
      toggleRecommendation: jest.fn(),
      trackEvent: jest.fn(),
    };
    const controller = new ProvidersController(providers as any, {} as any);
    const req = { user: { userId: 7, role: 'USUARIO' } } as any;

    controller.addRecommendation(3, req);
    controller.createPlatformIssue(req, {
      userId: 999,
      description: 'Problema real',
    });
    controller.createReport(3, req, {
      userId: 999,
      reason: 'FRAUDE',
    });
    controller.getRecommendationStatus(3, req);
    controller.toggleRecommendation(3, req);
    controller.trackEvent(3, { eventType: 'view', userId: 999 } as any);

    expect(providers.addRecommendation).toHaveBeenCalledWith(7, 3);
    expect(providers.createPlatformIssue).toHaveBeenCalledWith(
      7,
      'Problema real',
    );
    expect(providers.createReport).toHaveBeenCalledWith(
      expect.objectContaining({ providerId: 3, userId: 7 }),
    );
    expect(providers.getRecommendationStatus).toHaveBeenCalledWith(7, 3);
    expect(providers.toggleRecommendation).toHaveBeenCalledWith(7, 3);
    expect(providers.trackEvent).toHaveBeenCalledWith(3, 'view');
  });
});
