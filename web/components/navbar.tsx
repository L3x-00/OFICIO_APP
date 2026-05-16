'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  X,
  LogIn,
  ChevronDown,
  User,
  LogOut,
  LayoutDashboard,
} from 'lucide-react';
import { isAuthenticated, getUser, clearSession } from '@/lib/auth';
import AboutModal from '@/components/about-modal';

const navLinks = [
  { href: '/#beneficios',    label: 'Beneficios' },
  { href: '/#como-funciona', label: 'Cómo funciona' },
  { href: '/#testimonios',   label: 'Testimonios' },
  { href: '/#guia',          label: 'Manual' },
];

// Variantes de animación con tipado correcto (usando as const)
const mobileMenuVariants = {
  closed: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] as const },
  },
  open: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const },
  },
};

const dropdownVariants = {
  hidden: { opacity: 0, scale: 0.95, y: -8 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] as const },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: -8,
    transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [userName, setUserName] = useState('');
  const [userInitials, setUserInitials] = useState('');
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [panelPath, setPanelPath] = useState('/cliente');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Oculta el navbar en panel/cliente y también en vanity URLs `/p/*` —
  // las tarjetas públicas tienen su propio header de marca minimalista.
  if (pathname?.startsWith('/panel')
      || pathname?.startsWith('/cliente')
      || pathname?.startsWith('/p/')) {
    return null;
  }

  const handleLogout = () => {
    clearSession();
    setAuthed(false);
    setDropdownOpen(false);
    router.push('/');
  };

  return (
    <>
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as const }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'glass shadow-card-glass border-b border-white/5'
            : 'bg-transparent border-b border-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
          <div
            className={`flex items-center justify-between transition-all duration-300 ${
              scrolled ? 'h-14' : 'h-16'
            }`}
          >
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 flex-shrink-0 group">
              <div className="relative w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center shadow-glow-sm transition-transform duration-300 group-hover:scale-[1.04] border border-white/10">
                <Image
                  src="/images/logo/logo_light.png"
                  alt="OficioApp logo"
                  width={22}
                  height={22}
                  className="object-contain"
                  priority
                />
              </div>
              <span className="hidden sm:inline-block font-display font-bold text-[17px] tracking-tightest text-white group-hover:text-primary-light transition-colors">
                OficioApp
              </span>
            </Link>

            {/* Enlaces desktop */}
            <div className="hidden md:flex items-center gap-7">
              {navLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="nav-link-light relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-px after:bg-primary-light after:origin-right after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:duration-300 after:ease-smooth"
                >
                  {label}
                </Link>
              ))}
              <button
                onClick={() => setAboutOpen(true)}
                className="nav-link-light inline-flex items-center gap-1 group"
              >
                Conócenos
              </button>
            </div>

            {/* Desktop CTA - solo botón "Acceder" */}
            <div className="hidden md:flex items-center gap-2.5">
              {authed ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 bg-white/5 border border-white/10 hover:border-primary/30 px-2.5 py-1.5 rounded-full transition-all duration-200 hover:shadow-glow-sm"
                  >
                    {userAvatar ? (
                      <img
                        src={userAvatar}
                        alt={userName}
                        className="w-7 h-7 rounded-full object-cover ring-2 ring-white/10"
                      />
                    ) : (
                      <div className="avatar avatar-orange w-7 h-7 text-[11px]">
                        {userInitials}
                      </div>
                    )}
                    <span className="font-display font-medium text-sm text-white/80">
                      {userName}
                    </span>
                    <ChevronDown
                      size={14}
                      className={`text-white/40 transition-transform duration-200 ${
                        dropdownOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  <AnimatePresence>
                    {dropdownOpen && (
                      <motion.div
                        variants={dropdownVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="absolute right-0 top-full mt-2 w-56 glass rounded-xl py-1.5 z-50 shadow-glow-lg border border-white/10 overflow-hidden"
                      >
                        <Link
                          href={panelPath}
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                        >
                          <LayoutDashboard size={15} className="text-primary-light" />
                          Mi Panel
                        </Link>
                        <Link
                          href="/perfil"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                        >
                          <User size={15} className="text-primary-light" />
                          Mi perfil
                        </Link>
                        <div className="border-t border-white/5 my-1" />
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[13px] text-rose-400 hover:bg-rose-500/10 transition-colors"
                        >
                          <LogOut size={15} />
                          Cerrar sesión
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="btn btn-primary btn-sm press-effect inline-flex items-center gap-2"
                >
                  <LogIn size={14} />
                  Acceder
                </Link>
              )}
            </div>

            {/* Botón hamburguesa móvil */}
            <button
              className="md:hidden text-white/60 hover:text-white p-1 relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Menú"
            >
              <Menu
                size={22}
                className={`absolute transition-all duration-300 ${
                  mobileMenuOpen ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'
                }`}
              />
              <X
                size={22}
                className={`absolute transition-all duration-300 ${
                  mobileMenuOpen ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Menú móvil con AnimatePresence (variants tipadas correctamente) */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              variants={mobileMenuVariants}
              initial="closed"
              animate="open"
              exit="closed"
              className="md:hidden glass border-t border-white/10 mt-1 shadow-glow-lg"
            >
              <div className="px-4 pb-5 pt-3 space-y-1">
                {navLinks.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-white/70 hover:text-white hover:bg-white/5 rounded-lg px-3 py-2.5 transition-colors text-[14px] font-medium font-display"
                  >
                    {label}
                  </Link>
                ))}
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setAboutOpen(true);
                  }}
                  className="w-full text-left text-white/70 hover:text-white hover:bg-white/5 rounded-lg px-3 py-2.5 transition-colors text-[14px] font-medium font-display"
                >
                  Conócenos
                </button>
                <div className="pt-3 border-t border-white/10">
                  {authed ? (
                    <div className="space-y-1">
                      <Link
                        href={panelPath}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-2 text-white/70 hover:text-white hover:bg-white/5 rounded-lg px-3 py-2.5 transition-colors text-[14px] font-medium font-display"
                      >
                        <LayoutDashboard size={16} className="text-primary-light" />
                        Mi Panel
                      </Link>
                      <Link
                        href="/perfil"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-2 text-white/70 hover:text-white hover:bg-white/5 rounded-lg px-3 py-2.5 transition-colors text-[14px] font-medium font-display"
                      >
                        <User size={16} className="text-primary-light" />
                        Mi perfil
                      </Link>
                      <button
                        onClick={() => {
                          handleLogout();
                          setMobileMenuOpen(false);
                        }}
                        className="flex items-center gap-2 w-full text-rose-400 hover:bg-rose-500/10 rounded-lg px-3 py-2.5 transition-colors text-[14px] font-medium font-display"
                      >
                        <LogOut size={16} />
                        Cerrar sesión
                      </button>
                    </div>
                  ) : (
                    <Link
                      href="/login"
                      className="btn btn-primary press-effect w-full justify-center"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <LogIn size={16} />
                      Acceder
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      <AboutModal isOpen={aboutOpen} onClose={() => setAboutOpen(false)} />
    </>
  );
}