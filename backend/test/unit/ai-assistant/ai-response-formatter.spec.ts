import { formatAiReply } from '../../../src/ai-assistant/ai-response-formatter.js';

describe('formatAiReply', () => {
  it('elimina Markdown y conserva una lista legible', () => {
    expect(
      formatAiReply('**Plan**\n- Primer paso\n- Segundo paso\n---\n_*Listo*_'),
    ).toBe('Plan\n• Primer paso\n• Segundo paso\n\nListo');
  });

  it('normaliza saltos sin introducir caracteres de formato', () => {
    expect(formatAiReply('Uno\r\n\r\n\r\nDos -- fin')).toBe('Uno\n\nDos fin');
  });
});
