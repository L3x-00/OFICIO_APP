'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Adds 'is-visible' class to elements with [data-reveal] when they enter viewport.
 * Mount once at top of a page/section. Respects prefers-reduced-motion automatically (CSS).
 */
export function useScrollReveal(rootSelector?: string) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
        el.classList.add('is-visible');
      });
      return;
    }

    const root = rootSelector ? document.querySelector(rootSelector) : document;
    const targets = root?.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-visible)') ?? [];

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

    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [rootSelector]);
}

/**
 * Counts a number from 0 to `target` over `duration` ms with easeOutExpo.
 * Triggers when ref'd element enters viewport (once).
 * Returns [ref, displayValue].
 */
export function useCountUp(target: number, duration = 1800) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [value, setValue] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || startedRef.current) return;
    if (typeof window === 'undefined') return;

    const start = () => {
      if (startedRef.current) return;
      startedRef.current = true;
      const startTime = performance.now();
      const tick = (now: number) => {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);
        // easeOutExpo
        const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
        setValue(Math.round(target * eased));
        if (t < 1) requestAnimationFrame(tick);
        else setValue(target);
      };
      requestAnimationFrame(tick);
    };

    if (!('IntersectionObserver' in window)) {
      start();
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            start();
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [target, duration]);

  return { ref, value };
}
