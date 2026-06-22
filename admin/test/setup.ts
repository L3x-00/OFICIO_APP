import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Limpia el DOM entre tests (RTL no lo hace solo con Vitest).
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// jsdom no implementa scrollIntoView ni matchMedia — los stubeamos para
// que los componentes que los invocan no exploten en test.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn();
}
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}
