import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NotificationDetailModal } from '@/components/notification-detail-modal';
import type { NotificationItem } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  markNotificationRead: vi.fn(async () => ({})),
}));

function makeNotif(overrides: Partial<NotificationItem>): NotificationItem {
  return {
    id: 1,
    type: 'NEW_USER_VERIFIED',
    title: 'Nuevo usuario',
    message: 'Juan Pérez se registró con Google.',
    isRead: false,
    sentAt: '2026-06-20T12:00:00.000Z',
    provider: null,
    ...overrides,
  };
}

describe('NotificationDetailModal', () => {
  it('renderiza el tipo NEW_USER_VERIFIED con su etiqueta', () => {
    render(
      <NotificationDetailModal
        notification={makeNotif({})}
        onClose={vi.fn()}
        onRead={vi.fn()}
      />,
    );
    expect(screen.getByText('Nuevo usuario')).toBeInTheDocument();
    expect(
      screen.getByText(/Juan Pérez se registró con Google/),
    ).toBeInTheDocument();
  });

  // REGRESIÓN: un type que el frontend aún no conoce NO debe crashear el
  // modal (antes `TYPE_CONFIG[type]` era undefined → `cfg.icon` reventaba).
  it('no crashea con un type desconocido (usa fallback)', () => {
    const weird = makeNotif({
      // @ts-expect-error — simulamos un type futuro no mapeado
      type: 'TIPO_INEXISTENTE',
      message: 'Mensaje raro',
    });
    render(
      <NotificationDetailModal
        notification={weird}
        onClose={vi.fn()}
        onRead={vi.fn()}
      />,
    );
    expect(screen.getByText('Notificación')).toBeInTheDocument();
    expect(screen.getByText('Mensaje raro')).toBeInTheDocument();
  });

  it('devuelve null cuando no hay notificación', () => {
    const { container } = render(
      <NotificationDetailModal
        notification={null}
        onClose={vi.fn()}
        onRead={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
