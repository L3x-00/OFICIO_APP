import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mockeamos el núcleo HTTP para inspeccionar QUÉ request arma cada wrapper
// sin tocar la red. `api.ts` importa estos named exports de `./api-client`.
const fetchApi = vi.fn<(...args: unknown[]) => Promise<unknown>>();
vi.mock('@/lib/api-client', () => ({
  BASE_URL: 'http://test',
  getAdminToken: () => 'tok',
  fetchApi: (...args: unknown[]) => fetchApi(...args),
  fetchCSVBlob: vi.fn(),
  downloadXlsx: vi.fn(),
  setAdminToken: vi.fn(),
  clearAdminToken: vi.fn(),
  getAdminRefreshToken: vi.fn(),
  setAdminRefreshToken: vi.fn(),
}));

import {
  notifyProvider,
  getExpiringProviders,
  broadcastNotification,
  getNotifications,
} from '@/lib/api';

beforeEach(() => fetchApi.mockClear());

describe('admin api wrappers', () => {
  it('getExpiringProviders hace GET al endpoint de drill-down', async () => {
    await getExpiringProviders();
    expect(fetchApi).toHaveBeenCalledWith('/admin/expiring-providers');
  });

  it('notifyProvider hace POST con title/message/kind al proveedor correcto', async () => {
    await notifyProvider(42, {
      title: 'Tu plan vence',
      message: 'Renueva pronto',
      kind: 'EXPIRY_REMINDER',
    });
    expect(fetchApi).toHaveBeenCalledWith(
      '/admin/providers/42/notify',
      expect.objectContaining({ method: 'POST' }),
    );
    const opts = fetchApi.mock.calls[0]?.[1] as { body: string };
    const body = JSON.parse(opts.body) as Record<string, unknown>;
    expect(body).toEqual({
      title: 'Tu plan vence',
      message: 'Renueva pronto',
      kind: 'EXPIRY_REMINDER',
    });
  });

  it('broadcastNotification hace POST al endpoint masivo', async () => {
    await broadcastNotification({ title: 'Hola', message: 'Mundo' });
    expect(fetchApi).toHaveBeenCalledWith(
      '/admin/notifications/broadcast',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('getNotifications serializa paginación y rango ISO', async () => {
    await getNotifications({
      page: 2,
      from: '2026-07-01T05:00:00.000Z',
      to: '2026-08-01T04:59:59.999Z',
    });

    const path = fetchApi.mock.calls[0]?.[0] as string;
    const url = new URL(path, 'http://admin.local');
    expect(url.pathname).toBe('/admin/notifications');
    expect(url.searchParams.get('page')).toBe('2');
    expect(url.searchParams.get('limit')).toBe('20');
    expect(url.searchParams.get('from')).toBe('2026-07-01T05:00:00.000Z');
    expect(url.searchParams.get('to')).toBe('2026-08-01T04:59:59.999Z');
  });
});
