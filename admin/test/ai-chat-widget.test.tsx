import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AiChatWidget } from '@/components/ai-chat-widget';
import { askAssistant, getAssistantHistory } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  askAssistant: vi.fn(),
  getAssistantHistory: vi.fn(),
  startNewAssistantChat: vi.fn(),
}));

describe('AiChatWidget support flow', () => {
  it('renders official contact actions returned by Ofi', async () => {
    vi.mocked(getAssistantHistory).mockResolvedValue({ messages: [] });
    vi.mocked(askAssistant).mockResolvedValue({
      reply: 'Te conecto con soporte.',
      supportActions: [
        {
          kind: 'whatsapp',
          label: 'Escribir por WhatsApp',
          href: 'https://wa.me/51930759515?text=Hola',
        },
        {
          kind: 'email',
          label: 'Enviar correo a soporte',
          href: 'mailto:soporteofiapp@gmail.com',
        },
      ],
      meta: { promptVersion: 'v2', blocked: false },
    });

    render(<AiChatWidget />);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir asistente Ofi' }));
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Necesito soporte con mi cuenta' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    const whatsapp = await screen.findByRole('link', {
      name: 'Escribir por WhatsApp',
    });
    expect(whatsapp).toHaveAttribute('href', 'https://wa.me/51930759515?text=Hola');
    expect(whatsapp).toHaveAttribute('target', '_blank');
    expect(
      screen.getByRole('link', { name: 'Enviar correo a soporte' }),
    ).toHaveAttribute('href', 'mailto:soporteofiapp@gmail.com');
    await waitFor(() => expect(askAssistant).toHaveBeenCalledTimes(1));
  });
});
