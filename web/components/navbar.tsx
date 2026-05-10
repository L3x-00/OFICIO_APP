'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  Menu,
  X,
  LogIn,
  ChevronDown,
  User,
  LogOut,
  LayoutDashboard,
  Info,
} from 'lucide-react';
import { isAuthenticated, getUser, clearSession } from '@/lib/auth';
import AboutModal from '@/components/about-modal';

const navLinks = [
  { href: '/#beneficios',    label: 'Beneficios' },
  { href: '/#como-funciona', label: 'Cómo funciona' },
  { href: '/#testimonios',   label: 'Testimonios' },
  { href: '/#guia',          label: 'Manual' },
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
  const [aboutOpen, setAboutOpen] = useState(false);
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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
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
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-[backdrop-filter,background,box-shadow,border-color] duration-300 ${
          scrolled ? 'glass-warm shadow-soft' : 'bg-paper/0 border-b border-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
          <div className={`flex items-center justify-between transition-all duration-300 ${scrolled ? 'h-14' : 'h-16'}`}>

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 flex-shrink-0 group">
              <div className="relative w-9 h-9 rounded-xl bg-ink flex items-center justify-center shadow-ink-soft transition-transform duration-300 group-hover:scale-[1.04]">
                <Image
                  src="/images/logo/logo_dark.png"
                  alt="OficioApp logo"
                  width={22}
                  height={22}
                  className="object-contain"
                  priority
                />
              </div>
              <span className="hidden sm:inline-block font-display font-bold text-[17px] tracking-tightest text-ink group-hover:text-ink-2 transition-colors">
                OficioApp
              </span>
            </Link>

            {/* Desktop links */}
            <div className="hidden md:flex items-center gap-7">
              {navLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="nav-link-light"
                >
                  {label}
                </Link>
              ))}
              <button
                onClick={() => setAboutOpen(true)}
                className="nav-link-light flex items-center gap-1"
              >
                Conócenos
              </button>
            </div>

            {/* Desktop CTA */}
            <div className="hidden md:flex items-center gap-2.5">
              {authed ? (
                <div className="relative" ref={dropRef}>
                  <button
                    onClick={() => setDropOpen(!dropOpen)}
                    className="flex items-center gap-2 bg-surface border border-line-2 hover:border-ink-4 px-2.5 py-1.5 rounded-full transition-colors"
                  >
                    {userAvatar ? (
                      <img
                        src={userAvatar}
                        alt={userName}
                        className="w-7 h-7 rounded-full object-cover"
                      />
                    ) : (
                      <div className="avatar avatar-orange w-7 h-7 text-[11px]">
                        {userInitials}
                      </div>
                    )}
                    <span className="font-display font-medium text-sm text-ink-2">{userName}</span>
                    <ChevronDown
                      size={14}
                      className={`text-ink-4 transition-transform duration-200 ${dropOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {dropOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 card-3d rounded-xl py-1.5 z-50 animate-scale-in origin-top-right">
                      <Link
                        href={panelPath}
                        onClick={() => setDropOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-ink-2 hover:bg-surface-2 transition-colors"
                      >
                        <LayoutDashboard size={15} className="text-ink-4" />
                        Mi Panel
                      </Link>
                      <Link
                        href="/perfil"
                        onClick={() => setDropOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-ink-2 hover:bg-surface-2 transition-colors"
                      >
                        <User size={15} className="text-ink-4" />
                        Mi perfil
                      </Link>
                      <div className="border-t border-line my-1" />
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[13px] text-rose hover:bg-rose/5 transition-colors"
                      >
                        <LogOut size={15} />
                        Cerrar sesión
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="nav-link-light px-2"
                  >
                    Iniciar sesión
                  </Link>
                  <Link
                    href="/login"
                    className="btn btn-ink btn-sm press-effect"
                  >
                    <LogIn size={14} />
                    Acceder
                  </Link>
                </>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              className="md:hidden text-ink-3 hover:text-ink p-1 relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-surface transition-colors"
              onClick={() => setOpen(!open)}
              aria-label="Abrir menú"
            >
              <Menu
                size={22}
                className={`absolute transition-all duration-300 ${open ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'}`}
              />
              <X
                size={22}
                className={`absolute transition-all duration-300 ${open ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'}`}
              />
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ease-smooth ${
            open ? 'max-h-[28rem] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="bg-paper border-t border-line px-4 pb-5 pt-3 space-y-1 shadow-soft">
            {navLinks.map(({ href, label }, i) => (
              <Link
                key={href}
                href={href}
                className="block text-ink-2 hover:text-ink hover:bg-surface rounded-lg px-3 py-2.5 transition-colors text-[14px] font-medium animate-fade-in-up font-display"
                style={{ animationDelay: `${i * 60}ms` }}
                onClick={() => setOpen(false)}
              >
                {label}
              </Link>
            ))}
            <button
              onClick={() => {
                setOpen(false);
                setAboutOpen(true);
              }}
              className="flex items-center gap-2 w-full text-ink-2 hover:text-ink hover:bg-surface rounded-lg px-3 py-2.5 transition-colors text-[14px] font-medium font-display"
            >
              <Info size={15} />
              Conócenos
            </button>
            <div className="pt-3 border-t border-line">
              {authed ? (
                <div className="space-y-1">
                  <Link
                    href={panelPath}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 text-ink-2 hover:text-ink hover:bg-surface rounded-lg px-3 py-2.5 transition-colors text-[14px] font-medium font-display"
                  >
                    <LayoutDashboard size={15} />
                    Mi Panel
                  </Link>
                  <button
                    onClick={() => { handleLogout(); setOpen(false); }}
                    className="flex items-center gap-2 w-full text-rose hover:bg-rose/5 rounded-lg px-3 py-2.5 transition-colors text-[14px] font-medium font-display"
                  >
                    <LogOut size={15} />
                    Cerrar sesión
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="btn btn-ink press-effect w-full justify-center"
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

      {/* Modal Quiénes Somos */}
      <AboutModal isOpen={aboutOpen} onClose={() => setAboutOpen(false)} />
    </>
  );
}
