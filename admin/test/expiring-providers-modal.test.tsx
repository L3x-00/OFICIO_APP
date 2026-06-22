import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ExpiringProvider } from '@/lib/api';

const getExpiringProviders = vi.fn();
const notifyProvider = vi.fn();

vi.mock('@/lib/api', () => ({
  getExpiringProviders: () => getExpiringProviders(),
  notifyProvider: (id: number, data: unknown) => notifyProvider(id, data),
}));

import { ExpiringProvidersModal } from '@/components/expiring-providers-modal';

const PROV: ExpiringProvider = {
  providerId: 7,
  userId: 99,
  businessName: 'Electricidad Pérez',
  type: 'OFICIO',
  ownerName: 'Juan Pérez',
  phone: '999111222',
  locality: 'Tarapoto',
  category: 'Electricista',
  plan: 'PRO',
  endDate: '2026-06-25T00:00:00.000Z',
  daysLeft: 3,
};

beforeEach(() => {
  getExpiringProviders.mockReset();
  notifyProvider.mockReset();
  getExpiringProviders.mockResolvedValue([PROV]);
  notifyProvider.mockResolvedValue({ success: true, providerId: 7, userId: 99 });
});

describe('ExpiringProvidersModal', () => {
  it('lista los proveedores por vencer', async () => {
    render(<ExpiringProvidersModal onClose={vi.fn()} />);
    expect(await screen.findByText('Electricidad Pérez')).toBeInTheDocument();
    expect(screen.getByText(/3 días/)).toBeInTheDocument();
  });

  it('al elegir proveedor precarga el recordatorio de vencimiento', async () => {
    render(<ExpiringProvidersModal onClose={vi.fn()} />);
    await userEvent.click(await screen.findByText('Electricidad Pérez'));
    // El draft de recordatorio menciona el plan y el negocio.
    const msg = screen.getByPlaceholderText(
      /Mensaje que recibirá el proveedor/i,
    ) as HTMLTextAreaElement;
    expect(msg.value).toMatch(/plan PRO/);
    expect(msg.value).toMatch(/Electricidad Pérez/);
  });

  it('envía recordatorio (EXPIRY_REMINDER) al proveedor correcto y muestra éxito', async () => {
    render(<ExpiringProvidersModal onClose={vi.fn()} />);
    await userEvent.click(await screen.findByText('Electricidad Pérez'));
    await userEvent.click(screen.getByText('Enviar en tiempo real'));

    await waitFor(() => expect(notifyProvider).toHaveBeenCalledTimes(1));
    const [id, data] = notifyProvider.mock.calls[0];
    expect(id).toBe(7);
    expect(data).toMatchObject({ kind: 'EXPIRY_REMINDER' });
    expect(
      await screen.findByText(/Notificación enviada a Electricidad Pérez/),
    ).toBeInTheDocument();
  });

  it('permite cambiar a notificación libre (ADMIN_MESSAGE)', async () => {
    render(<ExpiringProvidersModal onClose={vi.fn()} />);
    await userEvent.click(await screen.findByText('Electricidad Pérez'));
    await userEvent.click(screen.getByText('Notificación'));

    const title = screen.getByPlaceholderText(
      /Título de la notificación/i,
    ) as HTMLInputElement;
    // Al cambiar de modo el formulario se limpia.
    expect(title.value).toBe('');

    await userEvent.type(title, 'Aviso importante');
    await userEvent.type(
      screen.getByPlaceholderText(/Mensaje que recibirá el proveedor/i),
      'Mensaje libre',
    );
    await userEvent.click(screen.getByText('Enviar en tiempo real'));

    await waitFor(() => expect(notifyProvider).toHaveBeenCalledTimes(1));
    expect(notifyProvider.mock.calls[0][1]).toMatchObject({
      kind: 'ADMIN_MESSAGE',
      title: 'Aviso importante',
      message: 'Mensaje libre',
    });
  });

  it('muestra estado vacío cuando no hay proveedores por vencer', async () => {
    getExpiringProviders.mockResolvedValue([]);
    render(<ExpiringProvidersModal onClose={vi.fn()} />);
    expect(
      await screen.findByText(/No hay proveedores por vencer/),
    ).toBeInTheDocument();
  });
});
