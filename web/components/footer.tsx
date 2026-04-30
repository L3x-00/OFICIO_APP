import Link from 'next/link';
import Image from 'next/image';
import { Mail, Heart } from 'lucide-react';

const productLinks = [
  { label: 'Beneficios',          href: '/#beneficios' },
  { label: 'Cómo funciona',       href: '/#como-funciona' },
  { label: 'Testimonios',         href: '/#testimonios' },
  { label: 'Panel de proveedor',  href: '/login' },
];

const legalLinks = [
  { label: 'soporte@oficioapp.pe',   href: 'mailto:soporte@oficioapp.pe' },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative border-t border-white/5 bg-bg-card/30 overflow-hidden">
      <div
        className="absolute inset-0 bg-grid-pattern bg-grid-md opacity-[0.03] pointer-events-none"
        aria-hidden
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-10">

          {/* Marca */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-4 group w-fit">
              <div className="relative w-9 h-9 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                <Image
                  src="/images/logo/logo_dark.png"
                  alt="OficioApp"
                  fill
                  className="object-contain"
                  sizes="36px"
                />
              </div>
              <span className="text-text-primary font-bold text-xl group-hover:text-primary transition-colors">
                OficioApp
              </span>
            </Link>
            <p className="text-text-muted text-sm leading-relaxed max-w-sm mb-5">
              El marketplace de servicios locales que conecta clientes con profesionales
              verificados en ciudades intermedias del Perú.
            </p>
            <a
              href="mailto:soporte@oficioapp.pe"
              className="inline-flex items-center gap-2 text-text-muted text-xs hover:text-primary transition-colors group"
            >
              <span className="w-7 h-7 rounded-full bg-white/5 group-hover:bg-primary/15 flex items-center justify-center transition-colors">
                <Mail size={13} />
              </span>
              soporte@oficioapp.pe
            </a>
          </div>

          {/* Producto */}
          <div>
            <h4 className="text-text-primary font-semibold text-xs mb-4 uppercase tracking-wider">
              Producto
            </h4>
            <ul className="space-y-2.5">
              {productLinks.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-text-muted text-sm hover:text-primary transition-colors inline-flex items-center gap-1.5 group"
                  >
                    <span className="w-1 h-1 rounded-full bg-text-muted/40 group-hover:bg-primary group-hover:w-3 transition-all duration-300" />
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal / Contacto */}
          <div>
            <h4 className="text-text-primary font-semibold text-xs mb-4 uppercase tracking-wider">
              Contacto
            </h4>
            <ul className="space-y-2.5">
              {legalLinks.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    className="text-text-muted text-sm hover:text-primary transition-colors"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Barra inferior */}
        <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-text-muted text-xs">
            © {year} OficioApp. Todos los derechos reservados.
          </span>
          <span className="text-text-muted/70 text-xs inline-flex items-center gap-1.5">
            Hecho con <Heart size={11} className="text-red fill-red animate-pulse-soft" /> en Perú
          </span>
        </div>
      </div>
    </footer>
  );
}
