import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearAdminToken, fetchApi, setAdminToken } from '@/lib/api-client';

describe('fetchApi multipart', () => {
  beforeEach(() => {
    clearAdminToken();
    vi.restoreAllMocks();
  });

  it('deja que el navegador genere el boundary de FormData', async () => {
    setAdminToken('token-admin');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const formData = new FormData();
    formData.append('image', new File(['foto'], 'perfil.jpg'));

    await fetchApi('/admin/providers/7/image', {
      method: 'POST',
      body: formData,
    });

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer token-admin');
    expect(headers['Content-Type']).toBeUndefined();
  });

  it('conserva application/json para requests normales', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await fetchApi('/admin/providers/7', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Servi' }),
    });

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
  });
});
