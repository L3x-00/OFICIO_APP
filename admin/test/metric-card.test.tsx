import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Users } from 'lucide-react';
import { MetricCard } from '@/components/metric-card';

describe('MetricCard', () => {
  it('renderiza título y valor', () => {
    render(<MetricCard title="Usuarios" value={1234} icon={Users} />);
    expect(screen.getByText('Usuarios')).toBeInTheDocument();
    // value.toLocaleString() → "1,234" o "1.234" según locale; basta el dígito.
    expect(screen.getByText(/1.?234/)).toBeInTheDocument();
  });

  it('cuando es clicable: muestra hint, tiene role=button y dispara onClick', async () => {
    const onClick = vi.fn();
    render(
      <MetricCard title="Vencen" value={3} icon={Users} onClick={onClick} />,
    );
    expect(screen.getByText('Ver detalle →')).toBeInTheDocument();
    const card = screen.getByRole('button');
    await userEvent.click(card);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('cuando NO es clicable: sin hint ni role button', () => {
    render(<MetricCard title="Estático" value={9} icon={Users} />);
    expect(screen.queryByText('Ver detalle →')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('responde a Enter por accesibilidad cuando es clicable', async () => {
    const onClick = vi.fn();
    render(
      <MetricCard title="Vencen" value={3} icon={Users} onClick={onClick} />,
    );
    const card = screen.getByRole('button');
    card.focus();
    await userEvent.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalled();
  });
});
