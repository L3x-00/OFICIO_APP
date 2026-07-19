import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Sidebar } from '@/components/sidebar';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

describe('Sidebar', () => {
  it('oculta referidos y recompensas del menú', () => {
    render(
      <Sidebar
        collapsed={false}
        onCollapsedChange={vi.fn()}
        mobileOpen={false}
        onMobileClose={vi.fn()}
      />,
    );

    expect(screen.queryByRole('link', { name: 'Referidos' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Recompensas' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
  });
});
