/**
 * UNIT — AuthController: cada endpoint delega en AuthService con los args
 * correctos (userId del JWT, no del body, etc.).
 */
import { AuthController } from '../../src/auth/auth.controller.js';

describe('AuthController (unit)', () => {
  let authService: Record<string, jest.Mock>;
  let controller: AuthController;

  const reqWith = (userId: number, ip = '1.2.3.4') =>
    ({ user: { userId }, ip }) as any;

  beforeEach(() => {
    jest.clearAllMocks();
    authService = {
      registerUser: jest.fn().mockResolvedValue({ ok: 1 }),
      login: jest.fn().mockResolvedValue({ ok: 1 }),
      registerProvider: jest.fn().mockResolvedValue({ ok: 1 }),
      refreshTokens: jest.fn().mockResolvedValue({ ok: 1 }),
      getMe: jest.fn().mockResolvedValue({ ok: 1 }),
      forgotPassword: jest.fn().mockResolvedValue({ ok: 1 }),
      resetPassword: jest.fn().mockResolvedValue({ ok: 1 }),
      adminRequestPasswordReset: jest.fn().mockResolvedValue({ ok: 1 }),
      sendOtp: jest.fn().mockResolvedValue({ ok: 1 }),
      verifyOtp: jest.fn().mockResolvedValue({ ok: 1 }),
      resendPendingOtp: jest.fn().mockResolvedValue({ ok: 1 }),
      socialLogin: jest.fn().mockResolvedValue({ ok: 1 }),
      deleteAccount: jest.fn().mockResolvedValue({ ok: 1 }),
      setupPassword: jest.fn().mockResolvedValue({ ok: 1 }),
    };
    controller = new AuthController(authService as any);
  });

  it('register → registerUser(dto)', async () => {
    const dto = { email: 'a@b.com' } as any;
    await controller.register(dto);
    expect(authService.registerUser).toHaveBeenCalledWith(dto);
  });

  it('login → login(email, password, req.ip)', async () => {
    await controller.login(
      { email: 'a@b.com', password: 'pw' } as any,
      reqWith(0, '9.9.9.9'),
    );
    expect(authService.login).toHaveBeenCalledWith('a@b.com', 'pw', '9.9.9.9');
  });

  it('registerProvider → usa userId del JWT + files', async () => {
    const dto = { type: 'OFICIO' } as any;
    const files = [{ originalname: 'a.jpg' }] as any;
    await controller.registerProvider(reqWith(7), dto, files);
    expect(authService.registerProvider).toHaveBeenCalledWith(7, dto, files);
  });

  it('refresh → refreshTokens(body.refreshToken)', async () => {
    await controller.refresh({ refreshToken: 'rt' });
    expect(authService.refreshTokens).toHaveBeenCalledWith('rt');
  });

  it('getMe → getMe(req.user.userId)', async () => {
    await controller.getMe(reqWith(7));
    expect(authService.getMe).toHaveBeenCalledWith(7);
  });

  it('forgotPassword → forgotPassword(dto.email)', async () => {
    await controller.forgotPassword({ email: 'a@b.com' } as any);
    expect(authService.forgotPassword).toHaveBeenCalledWith('a@b.com');
  });

  it('resetPassword → resetPassword(email, token, newPassword)', async () => {
    await controller.resetPassword({
      email: 'a@b.com',
      token: '123456',
      newPassword: 'np',
    } as any);
    expect(authService.resetPassword).toHaveBeenCalledWith(
      'a@b.com',
      '123456',
      'np',
    );
  });

  it('adminRequestReset → adminRequestPasswordReset(Number(userId))', async () => {
    await controller.adminRequestReset('7' as any);
    expect(authService.adminRequestPasswordReset).toHaveBeenCalledWith(7);
  });

  it('sendOtp → sendOtp(dto.userId)', async () => {
    await controller.sendOtp({ userId: 7 } as any);
    expect(authService.sendOtp).toHaveBeenCalledWith(7);
  });

  it('verifyOtp → verifyOtp(pendingId, code)', async () => {
    await controller.verifyOtp({ pendingId: 'p1', code: '123456' } as any);
    expect(authService.verifyOtp).toHaveBeenCalledWith('p1', '123456');
  });

  it('resendOtp → resendPendingOtp(body.pendingId)', async () => {
    await controller.resendOtp({ pendingId: 'p1' });
    expect(authService.resendPendingOtp).toHaveBeenCalledWith('p1');
  });

  it('socialLogin → socialLogin(idToken, req.ip)', async () => {
    await controller.socialLogin({ idToken: 'tok' } as any, reqWith(0, '5.5.5.5'));
    expect(authService.socialLogin).toHaveBeenCalledWith('tok', '5.5.5.5');
  });

  it('deleteAccount → deleteAccount(req.user.userId)', async () => {
    await controller.deleteAccount(reqWith(7));
    expect(authService.deleteAccount).toHaveBeenCalledWith(7);
  });

  it('setupPassword → setupPassword(userId, newPassword)', async () => {
    await controller.setupPassword(reqWith(7), { newPassword: 'np' });
    expect(authService.setupPassword).toHaveBeenCalledWith(7, 'np');
  });
});
