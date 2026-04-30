'use client';

import { useEffect } from 'react';

/**
 * Activa data-reveal globalmente en el árbol del documento.
 * Vuelve a observar nuevos elementos en cada cambio de ruta (MutationObserver ligero).
 */
export default function RevealProvider() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const observe = () => {
      if (!('IntersectionObserver' in window)) {
        document
          .querySelectorAll<HTMLElement>('[data-reveal]:not(.is-visible)')
          .forEach((el) => el.classList.add('is-visible'));
        return null;
      }

      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              io.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
      );

      document
        .querySelectorAll<HTMLElement>('[data-reveal]:not(.is-visible)')
        .forEach((el) => io.observe(el));

      return io;
    };

    let io = observe();

    const mo = new MutationObserver(() => {
      io?.disconnect();
      io = observe();
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io?.disconnect();
      mo.disconnect();
    };
  }, []);

  return null;
}
