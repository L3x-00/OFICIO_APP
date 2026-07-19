import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getNotifications: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  getNotifications: mocks.getNotifications,
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
}));
vi.mock('@/hooks/useAdminSocket', () => ({
  useAdminSocket: vi.fn(),
}));
vi.mock('next/dynamic', () => ({
  default: () => () => null,
}));

import { NotificationsList } from '@/components/notifications-list';

describe('NotificationsList', () => {
  beforeEach(() => {
    mocks.getNotifications.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      lastPage: 1,
      unreadCount: 0,
    });
  });

  it('envía al backend el rango completo de los días seleccionados', async () => {
    render(<NotificationsList />);
    await waitFor(() => expect(mocks.getNotifications).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText('Desde'), {
      target: { value: '2026-07-10' },
    });
    fireEvent.change(screen.getByLabelText('Hasta'), {
      target: { value: '2026-07-12' },
    });

    await waitFor(() => {
      expect(mocks.getNotifications).toHaveBeenCalledWith({
        page: 1,
        from: new Date('2026-07-10T00:00:00.000').toISOString(),
        to: new Date('2026-07-12T23:59:59.999').toISOString(),
      });
    });
  });
});
