'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X, LogIn } from 'lucide-react';

const navLinks = [
  { href: '/#beneficios',    label: 'Beneficios' },
  { href: '/#como-funciona', label: 'Cómo funciona' },
  { href: '/#testimonios',   label: 'Testimonios' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  const linkClass =
    'text-text-secondary hover:text-primary transition-colors duration-200 text-sm font-medium';

  return (
    <nav className="sticky top-0 z-50 bg-bg-dark/80 backdrop-blur-md border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="relative w-8 h-8">
              <Image
                src="/images/logo/logo_dark.png"
                alt="OficioApp logo"
                fill
                className="object-contain"
                sizes="32px"
                priority
              />
            </div>
            <span className="text-text-primary font-bold text-lg hidden sm:block">
              OficioApp
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map(({ href, label }) => (
              <Link key={href} href={href} className={linkClass}>
                {label}
              </Link>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-5 py-2 rounded-button text-sm font-semibold transition-all duration-200 hover:shadow-lg hover:shadow-primary/30"
            >
              <LogIn size={15} />
              Iniciar sesión
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-text-secondary hover:text-primary transition-colors p-1"
            onClick={() => setOpen(!open)}
            aria-label="Abrir menú"
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-bg-card border-t border-white/5 px-4 pb-5 pt-3 space-y-1 shadow-xl">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="block text-text-secondary hover:text-primary hover:bg-white/5 rounded-lg px-3 py-2.5 transition-colors text-sm font-medium"
              onClick={() => setOpen(false)}
            >
              {label}
            </Link>
          ))}
          <div className="pt-2 border-t border-white/5">
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-button font-semibold text-sm w-full transition-colors"
              onClick={() => setOpen(false)}
            >
              <LogIn size={16} />
              Iniciar sesión
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
