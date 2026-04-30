'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X, LogIn, ChevronDown, User, LogOut, LayoutDashboard } from 'lucide-react';
import { isAuthenticated, getUser, clearSession } from '@/lib/auth';

const navLinks = [
  { href: '/#beneficios',    label: 'Beneficios' },
  { href: '/#como-funciona', label: 'Cómo funciona' },
  { href: '/#testimonios',   label: 'Testimonios' },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [userName, setUserName] = useState('');
  const [userInitials, setUserInitials] = useState('');
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [panelPath, setPanelPath] = useState('/cliente');
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const user = getUser();
    if (isAuthenticated() && user) {
      setAuthed(true);
      setUserName(user.firstName);
      setUserInitials(
        `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
      );
      setUserAvatar(user.avatarUrl ?? null);
      setPanelPath(user.role === 'PROVEEDOR' || user.role === 'ADMIN' ? '/panel' : '/cliente');
    } else {
      setAuthed(false);
    }
  }, [pathname]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Detecta scroll para refinar background del navbar
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (pathname?.startsWith('/panel') || pathname?.startsWith('/cliente')) {
    return null;
  }

  const handleLogout = () => {
    clearSession();
    setAuthed(false);
    setDropOpen(false);
    router.push('/');
  };

  return (
    <nav
      className={`sticky top-0 z-50 transition-all duration-300 ease-smooth ${
        scrolled
          ? 'bg-bg-dark/85 backdrop-blur-xl border-b border-white/10 shadow-lg shadow-black/30'
          : 'bg-bg-dark/40 backdrop-blur-md border-b border-white/5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`flex items-center justify-between transition-all duration-300 ${scrolled ? 'h-14' : 'h-16'}`}>

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0 group">
            <div className="relative w-8 h-8 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
              <Image
                src="/images/logo/logo_dark.png"
                alt="OficioApp logo"
                fill
                className="object-contain"
                sizes="32px"
                priority
              />
            </div>
            <span className="text-text-primary font-bold text-lg hidden sm:block group-hover:text-primary transition-colors">
              OficioApp
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="nav-link text-text-secondary hover:text-white transition-colors duration-200 text-sm font-medium"
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            {authed ? (
              <div className="relative" ref={dropRef}>
                <button
                  onClick={() => setDropOpen(!dropOpen)}
                  className="flex items-center gap-2 bg-bg-card/80 backdrop-blur-sm border border-white/10 hover:border-primary/40 px-3 py-1.5 rounded-button transition-all duration-200 hover-lift"
                >
                  {userAvatar ? (
                    <img
                      src={userAvatar}
                      alt={userName}
                      className="w-7 h-7 rounded-full object-cover ring-2 ring-primary/30"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-gradient-primary text-white text-xs font-bold flex items-center justify-center shadow-glow-sm">
                      {userInitials}
                    </div>
                  )}
                  <span className="text-text-primary text-sm font-medium">{userName}</span>
                  <ChevronDown
                    size={14}
                    className={`text-text-muted transition-transform duration-200 ${dropOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {dropOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 glass-card rounded-card shadow-2xl py-1 z-50 animate-scale-in origin-top-right">
                    <Link
                      href={panelPath}
                      onClick={() => setDropOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
                    >
                      <LayoutDashboard size={15} />
                      Mi Panel
                    </Link>
                    <Link
                      href="/perfil"
                      onClick={() => setDropOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
                    >
                      <User size={15} />
                      Mi perfil
                    </Link>
                    <div className="border-t border-white/5 my-1" />
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red hover:bg-red/10 transition-colors"
                    >
                      <LogOut size={15} />
                      Cerrar sesión
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="btn-primary press-effect inline-flex items-center gap-2 px-5 py-2 rounded-button text-sm font-semibold"
              >
                <LogIn size={15} />
                Iniciar sesión
              </Link>
            )}
          </div>

          {/* Mobile hamburger con morph */}
          <button
            className="md:hidden text-text-secondary hover:text-primary transition-colors p-1 relative w-8 h-8 flex items-center justify-center"
            onClick={() => setOpen(!open)}
            aria-label="Abrir menú"
          >
            <Menu
              size={24}
              className={`absolute transition-all duration-300 ${open ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'}`}
            />
            <X
              size={24}
              className={`absolute transition-all duration-300 ${open ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'}`}
            />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ease-smooth ${
          open ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="bg-bg-card/95 backdrop-blur-xl border-t border-white/5 px-4 pb-5 pt-3 space-y-1 shadow-xl">
          {navLinks.map(({ href, label }, i) => (
            <Link
              key={href}
              href={href}
              className="block text-text-secondary hover:text-primary hover:bg-white/5 rounded-lg px-3 py-2.5 transition-colors text-sm font-medium animate-fade-in-up"
              style={{ animationDelay: `${i * 60}ms` }}
              onClick={() => setOpen(false)}
            >
              {label}
            </Link>
          ))}
          <div className="pt-2 border-t border-white/5">
            {authed ? (
              <div className="space-y-1">
                <Link
                  href={panelPath}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 text-text-secondary hover:text-primary hover:bg-white/5 rounded-lg px-3 py-2.5 transition-colors text-sm font-medium"
                >
                  <LayoutDashboard size={15} />
                  Mi Panel
                </Link>
                <button
                  onClick={() => { handleLogout(); setOpen(false); }}
                  className="flex items-center gap-2 w-full text-red hover:bg-red/10 rounded-lg px-3 py-2.5 transition-colors text-sm font-medium"
                >
                  <LogOut size={15} />
                  Cerrar sesión
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="btn-primary press-effect flex items-center justify-center gap-2 px-5 py-2.5 rounded-button font-semibold text-sm w-full"
                onClick={() => setOpen(false)}
              >
                <LogIn size={16} />
                Iniciar sesión
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
