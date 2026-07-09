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
import AboutModal from '@/components/modals/about-modal';
import ThemeToggle from '@/components/theme/theme-toggle';

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

  // En la home el hero es una foto oscura en AMBOS temas: mientras el navbar
  // está transparente encima, sus textos deben ser blancos aunque el tema sea
  // claro. Al hacer scroll pasa a glass y vuelve a los colores por tema.
  const overHero = pathname === '/' && !scrolled;
  const linkCls = overHero
    ? 'text-white/85 hover:text-white'
    : 'text-gray-700 dark:text-white/80 hover:text-gray-900 dark:hover:text-white';

  return (
    <>
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as const }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'glass dark:glass shadow-card-glass border-b border-white/5 dark:border-white/5'
            : `bg-transparent border-b border-transparent ${overHero ? 'force-dark-zone' : ''}`
        }`}
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
          <div
            className={`flex items-center justify-between transition-all duration-300 ${
              scrolled ? 'h-16' : 'h-20'
            }`}
          >
            {/* Logo - más grande y sin borde redondo */}
            <Link href="/" className="flex items-center gap-3 flex-shrink-0 group">
              <div className="relative w-12 h-12 flex items-center justify-center transition-transform duration-300 group-hover:scale-[1.05]">
                <Image
                  src="/images/logo/servi.png"
                  alt="Servi logo"
                  width={40}
                  height={40}
                  className="object-contain"
                  priority
                />
              </div>
              <span className={`hidden sm:inline-block font-display font-bold text-xl tracking-tightest ${overHero ? 'text-white' : 'text-gray-900 dark:text-white'} group-hover:text-primary dark:group-hover:text-primary-light transition-colors`}>
                Servi
              </span>
            </Link>

            {/* Enlaces desktop - letras más gruesas y grandes */}
            <div className="hidden lg:flex items-center gap-8">
              {navLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={`${linkCls} font-semibold text-[15px] transition-colors relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-[2px] after:bg-primary dark:after:bg-primary-light after:origin-right after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:duration-300 after:ease-smooth`}
                >
                  {label}
                </Link>
              ))}
              <button
                onClick={() => setAboutOpen(true)}
                className={`${linkCls} font-semibold text-[15px] transition-colors inline-flex items-center gap-1 group`}
              >
                Conócenos
              </button>
            </div>

            {/* Desktop CTA - toggle de tema + Acceder/avatar */}
            <div className="hidden lg:flex items-center gap-3">
              {/* Toggle de tema (sol/luna) — siempre visible antes
                  del CTA, igual para users autenticados y públicos. */}
              <ThemeToggle />
              {authed ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2.5 bg-white/10 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-primary/30 dark:hover:border-primary/30 px-3.5 py-2 rounded-full transition-all duration-200 hover:shadow-glow-sm"
                  >
                    {userAvatar ? (
                      <img
                        src={userAvatar}
                        alt={userName}
                        className="w-8 h-8 rounded-full object-cover ring-2 ring-gray-200 dark:ring-white/10"
                      />
                    ) : (
                      <div className="avatar avatar-orange w-8 h-8 text-[13px]">
                        {userInitials}
                      </div>
                    )}
                    <span className="font-display font-semibold text-sm text-gray-700 dark:text-white/80">
                      {userName}
                    </span>
                    <ChevronDown
                      size={16}
                      className={`text-gray-400 dark:text-white/40 transition-transform duration-200 ${
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
                        className="absolute right-0 top-full mt-2 w-56 glass dark:glass rounded-xl py-1.5 z-50 shadow-glow-lg border border-gray-200/50 dark:border-white/10 overflow-hidden"
                      >
                        <Link
                          href={panelPath}
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-[14px] font-medium text-gray-600 dark:text-white/70 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                        >
                          <LayoutDashboard size={16} className="text-primary dark:text-primary-light" />
                          Mi Panel
                        </Link>
                        <Link
                          href="/perfil"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-[14px] font-medium text-gray-600 dark:text-white/70 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                        >
                          <User size={16} className="text-primary dark:text-primary-light" />
                          Mi perfil
                        </Link>
                        <div className="border-t border-gray-200/50 dark:border-white/5 my-1" />
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[14px] font-medium text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                        >
                          <LogOut size={16} />
                          Cerrar sesión
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="btn btn-primary btn-md press-effect inline-flex items-center gap-2.5 font-semibold px-5 py-2.5"
                >
                  <LogIn size={16} />
                  Acceder
                </Link>
              )}
            </div>

            {/* Botón hamburguesa móvil */}
            <button
              className={`lg:hidden ${overHero ? 'text-white/80 hover:text-white hover:bg-white/10' : 'text-gray-700 dark:text-white/60 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'} p-1.5 relative w-10 h-10 flex items-center justify-center rounded-lg transition-colors`}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Menú"
            >
              <Menu
                size={24}
                className={`absolute transition-all duration-300 ${
                  mobileMenuOpen ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'
                }`}
              />
              <X
                size={24}
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
              className="lg:hidden glass dark:glass border-t border-gray-200/50 dark:border-white/10 mt-1 shadow-glow-lg"
            >
              <div className="px-4 pb-5 pt-3 space-y-1">
                {navLinks.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-gray-700 dark:text-white/80 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg px-3 py-2.5 transition-colors text-[15px] font-semibold font-display"
                  >
                    {label}
                  </Link>
                ))}
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setAboutOpen(true);
                  }}
                  className="w-full text-left text-gray-700 dark:text-white/80 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg px-3 py-2.5 transition-colors text-[15px] font-semibold font-display"
                >
                  Conócenos
                </button>
                <div className="pt-3 border-t border-gray-200/50 dark:border-white/10">
                  {authed ? (
                    <div className="space-y-1">
                      <Link
                        href={panelPath}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-2 text-gray-700 dark:text-white/80 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg px-3 py-2.5 transition-colors text-[15px] font-semibold font-display"
                      >
                        <LayoutDashboard size={18} className="text-primary dark:text-primary-light" />
                        Mi Panel
                      </Link>
                      <Link
                        href="/perfil"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-2 text-gray-700 dark:text-white/80 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg px-3 py-2.5 transition-colors text-[15px] font-semibold font-display"
                      >
                        <User size={18} className="text-primary dark:text-primary-light" />
                        Mi perfil
                      </Link>
                      <button
                        onClick={() => {
                          handleLogout();
                          setMobileMenuOpen(false);
                        }}
                        className="flex items-center gap-2 w-full text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg px-3 py-2.5 transition-colors text-[15px] font-semibold font-display"
                      >
                        <LogOut size={18} />
                        Cerrar sesión
                      </button>
                    </div>
                  ) : (
                    <Link
                      href="/login"
                      className="btn btn-primary press-effect w-full justify-center font-semibold py-2.5"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <LogIn size={18} />
                      Acceder
                    </Link>
                  )}
                  {/* Toggle de tema en el drawer mobile — mismo botón
                      ícono que en desktop, alineado a la derecha. */}
                  <div className="flex justify-end pt-2 border-t border-gray-200/50 dark:border-white/5">
                    <ThemeToggle />
                  </div>
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