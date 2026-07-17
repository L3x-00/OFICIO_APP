import {
  AdminReportsService,
  escapeCsvCell,
} from '../../src/admin/services/admin-reports.service.js';
import { createPrismaMock, type PrismaMock } from '../mocks/prisma.mock';

describe('AdminReportsService CSV security', () => {
  let prisma: PrismaMock;
  let service: AdminReportsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new AdminReportsService(prisma as any);
  });

  it('escapa comillas y neutraliza fórmulas de hoja de cálculo', () => {
    expect(escapeCsvCell('=2+2')).toBe('"\'=2+2"');
    expect(escapeCsvCell('  @SUM(A1)')).toBe('"\'  @SUM(A1)"');
    expect(escapeCsvCell('a,\"b\"')).toBe('"a,""b"""');
  });

  it('protege campos controlados por usuarios en el CSV de usuarios', async () => {
    prisma.user.findMany.mockResolvedValue([
      {
        id: 1,
        firstName: '=HYPERLINK("https://evil")',
        lastName: 'O"Connor',
        email: '+cmd@example.com',
        role: 'USUARIO',
        isActive: true,
        createdAt: new Date('2026-07-16T00:00:00Z'),
        providers: [],
        _count: { reviews: 0 },
      },
    ]);

    const csv = await service.exportUsersCSV();

    expect(csv).toContain('"\'=HYPERLINK(""https://evil"")"');
    expect(csv).toContain('"O""Connor"');
    expect(csv).toContain('"\'+cmd@example.com"');
  });

  it('protege campos controlados por proveedores en su exportación', async () => {
    prisma.provider.findMany.mockResolvedValue([
      {
        id: 2,
        businessName: '@SUM(1+1)',
        user: {
          email: 'provider@example.com',
          firstName: 'Ana',
          lastName: 'Soto',
        },
        phone: '999999999',
        providerCategories: [],
        locality: { name: 'Lima' },
        averageRating: 4.5,
        totalReviews: 3,
        isVerified: true,
        verificationStatus: 'APROBADO',
        subscription: null,
      },
    ]);

    const csv = await service.exportProvidersCSV();

    expect(csv).toContain('"\'@SUM(1+1)"');
  });
});
