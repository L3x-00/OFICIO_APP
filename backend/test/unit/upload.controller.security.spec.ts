import { GUARDS_METADATA } from '@nestjs/common/constants';
import { JwtAuthGuard } from '../../src/auth/jwt.guard.js';
import { RolesGuard } from '../../src/auth/roles.guard.js';
import { ROLES_KEY } from '../../src/auth/roles.decorator.js';
import { UploadController } from '../../src/reviews/upload.controller.js';

describe('UploadController security metadata', () => {
  it('requires JWT for every upload route', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      UploadController,
    ) as unknown[];

    expect(guards).toContain(JwtAuthGuard);
  });

  it('requires ADMIN role for broadcast images', () => {
    const handler = UploadController.prototype.uploadBroadcastImage;
    const guards = Reflect.getMetadata(GUARDS_METADATA, handler) as unknown[];
    const roles = Reflect.getMetadata(ROLES_KEY, handler) as string[];

    expect(guards).toContain(RolesGuard);
    expect(roles).toEqual(['ADMIN']);
  });
});
