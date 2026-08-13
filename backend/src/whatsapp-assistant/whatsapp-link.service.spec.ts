import {
  LINK_FAILURE_REPLY,
  LINK_SUCCESS_REPLY,
  WhatsappLinkService,
} from './whatsapp-link.service.js';

const SESSION = 'servi-session';

function config(overrides: Record<string, unknown> = {}) {
  return {
    linkOperational: true,
    sessionId: SESSION,
    linkSecret: 'link-secret',
    linkTtlMs: 10 * 60_000,
    ...overrides,
  } as any;
}

function activeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 7,
    role: 'USUARIO',
    isActive: true,
    deletedAt: null,
    providers: [],
    ...overrides,
  };
}

function store(overrides: Record<string, unknown> = {}) {
  const db: any = {
    whatsappLinkChallenge: {
      create: jest.fn().mockResolvedValue({ id: 1 }),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      findFirst: jest.fn().mockResolvedValue(null),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    whatsappLinkedContact: {
      findUnique: jest.fn().mockResolvedValue(null),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      upsert: jest.fn().mockResolvedValue({ userId: 7 }),
    },
    user: {
      findFirst: jest.fn().mockResolvedValue(activeUser()),
    },
    $transaction: jest.fn(async (fn: (tx: typeof db) => Promise<unknown>) =>
      fn(db),
    ),
    ...overrides,
  };
  return db;
}

describe('WhatsappLinkService', () => {
  it('flag/config incompleta → no genera desafío', async () => {
    const db = store();
    const svc = new WhatsappLinkService(db, config({ linkOperational: false }));

    await expect(svc.createLinkCode(7)).resolves.toBeNull();
    expect(db.user.findFirst).not.toHaveBeenCalled();
    expect(db.whatsappLinkChallenge.create).not.toHaveBeenCalled();
  });

  it('genera código de alta entropía y persiste solo HMAC', async () => {
    const db = store();
    const svc = new WhatsappLinkService(db, config());

    const out = await svc.createLinkCode(7);

    expect(out?.code).toMatch(/^[A-HJKMNP-Z2-9]{10}$/);
    const data = db.whatsappLinkChallenge.create.mock.calls[0][0].data;
    expect(data.codeHash).toEqual(expect.any(String));
    expect(data).not.toHaveProperty('code');
    expect(data.codeHash).not.toBe(out?.code);
    expect(data.userId).toBe(7);
  });

  it('challenge vencido o inexistente → falla genérico y no crea vínculo', async () => {
    const db = store();
    const svc = new WhatsappLinkService(db, config());

    await expect(svc.consumeCode('contact-hmac', 'ABCDEFGHJK')).resolves.toBe(
      false,
    );
    expect(db.whatsappLinkedContact.upsert).not.toHaveBeenCalled();
    expect(LINK_FAILURE_REPLY).not.toContain('vencido');
  });

  it('un código solo se consume una vez bajo concurrencia', async () => {
    const db = store();
    db.whatsappLinkChallenge.findFirst.mockResolvedValue({ id: 11, userId: 7 });
    db.whatsappLinkChallenge.updateMany.mockResolvedValue({ count: 0 });
    const svc = new WhatsappLinkService(db, config());

    await expect(svc.consumeCode('contact-hmac', 'ABCDEFGHJK')).resolves.toBe(
      false,
    );
    expect(db.whatsappLinkedContact.upsert).not.toHaveBeenCalled();
  });

  it('no permite tomar un contacto ya vinculado a otra cuenta', async () => {
    const db = store();
    db.whatsappLinkChallenge.findFirst.mockResolvedValue({ id: 11, userId: 7 });
    db.whatsappLinkedContact.findUnique.mockResolvedValue({ userId: 8 });
    const svc = new WhatsappLinkService(db, config());

    await expect(svc.consumeCode('contact-hmac', 'ABCDEFGHJK')).resolves.toBe(
      false,
    );
    expect(db.whatsappLinkChallenge.updateMany).not.toHaveBeenCalled();
    expect(db.whatsappLinkedContact.deleteMany).not.toHaveBeenCalled();
  });

  it('no confirma un vínculo si una carrera conserva otro dueño', async () => {
    const db = store();
    db.whatsappLinkChallenge.findFirst.mockResolvedValue({ id: 11, userId: 7 });
    db.whatsappLinkedContact.upsert.mockResolvedValue({ userId: 8 });
    const svc = new WhatsappLinkService(db, config());

    await expect(svc.consumeCode('contact-hmac', 'ABCDEFGHJK')).resolves.toBe(
      false,
    );
  });

  it('vínculo válido reemplaza solo el contacto anterior de la misma cuenta', async () => {
    const db = store();
    db.whatsappLinkChallenge.findFirst.mockResolvedValue({ id: 11, userId: 7 });
    const svc = new WhatsappLinkService(db, config());

    await expect(svc.consumeCode('contact-hmac', 'ABCDEFGHJK')).resolves.toBe(
      true,
    );
    expect(db.whatsappLinkedContact.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 7,
          NOT: { contactHash: 'contact-hmac' },
        }),
      }),
    );
    expect(db.whatsappLinkedContact.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          userId: 7,
          contactHash: 'contact-hmac',
        }),
      }),
    );
    expect(LINK_SUCCESS_REPLY).toContain('Vinculamos');
  });

  it('resuelve identidad viva y degrada ADMIN a USUARIO', async () => {
    const db = store();
    db.whatsappLinkedContact.findUnique.mockResolvedValue({ userId: 7 });
    db.user.findFirst.mockResolvedValue(
      activeUser({ role: 'ADMIN', providers: [{ type: 'PROFESIONAL' }] }),
    );
    const svc = new WhatsappLinkService(db, config());

    await expect(svc.resolveIdentity('contact-hmac')).resolves.toEqual({
      role: 'USUARIO',
      providerType: 'PROFESIONAL',
    });
  });
});
