'use client';

import { useState, ReactNode } from 'react';

interface Tab {
  key: string;
  label: string;
  badge?: number;
  content: ReactNode;
}

/**
 * Tabs minimalista, sin dependencias externas. Pintada con la paleta
 * `surface-*` de la admin. Cada tab guarda su contenido en árbol pero
 * solo el activo se monta — los inactivos se montan al primer cambio
 * usando `mountedKeys` para evitar pegar al backend con N fetches.
 */
export function AdminTabs({ tabs, initial }: { tabs: Tab[]; initial?: string }) {
  const [active, setActive] = useState(initial ?? tabs[0]?.key);
  const [mounted, setMounted] = useState<Set<string>>(() => new Set([active]));

  function pick(key: string) {
    setActive(key);
    setMounted((prev) => prev.has(key) ? prev : new Set(prev).add(key));
  }

  return (
    <div>
      <div style={{
        display: 'flex',
        gap: '4px',
        borderBottom: '1px solid var(--border-default)',
        marginBottom: '20px',
      }}>
        {tabs.map((t) => {
          const isActive = active === t.key;
          return (
            <button
              key={t.key}
              onClick={() => pick(t.key)}
              style={{
                padding: '10px 16px',
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--brand-light)' : '2px solid transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-tertiary)',
                fontWeight: isActive ? 600 : 500,
                cursor: 'pointer',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '-1px',
              }}
            >
              {t.label}
              {typeof t.badge === 'number' && t.badge > 0 && (
                <span style={{
                  minWidth: '18px',
                  height: '18px',
                  padding: '0 5px',
                  borderRadius: '9px',
                  background: 'var(--danger)',
                  color: '#fff',
                  fontSize: '10px',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {t.badge > 99 ? '99+' : t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tabs.map((t) => (
        <div key={t.key} style={{ display: active === t.key ? 'block' : 'none' }}>
          {mounted.has(t.key) ? t.content : null}
        </div>
      ))}
    </div>
  );
}
