import { ProviderProfileService } from '../../src/provider-profile/provider-profile.service.js';
import { createEventsGatewayMock } from '../mocks/events-gateway.mock';
import { createPrismaMock, type PrismaMock } from '../mocks/prisma.mock';

describe('ProviderProfileService notification retention', () => {
  let prisma: PrismaMock;
  let service: ProviderProfileService;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(Date.parse('2026-07-19T12:00:00.000Z'));
    prisma = createPrismaMock();
    prisma.adminNotification.deleteMany.mockResolvedValue({ count: 2 });
    service = new ProviderProfileService(
      prisma as any,
      createEventsGatewayMock() as any,
      {
        assertManagedImageUrl: jest.fn((url: string) => url),
        isSameImageReference: jest.fn(() => false),
      } as any,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('purga leídas a 5 días y conserva no leídas hasta 30 días', async () => {
    await service.pruneOldNotifications();

    const call = prisma.adminNotification.deleteMany.mock.calls[0][0];
    const [readRule, unreadRule] = call.where.OR;
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    expect(readRule).toEqual({
      isRead: true,
      sentAt: { lt: new Date(now - 5 * day) },
    });
    expect(unreadRule).toEqual({
      isRead: false,
      sentAt: { lt: new Date(now - 30 * day) },
    });
  });
});
