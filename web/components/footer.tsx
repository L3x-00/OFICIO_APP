import Link from 'next/link';
import Image from 'next/image';

const productLinks = [
  { label: 'Beneficios',          href: '/#beneficios' },
  { label: 'Cómo funciona',       href: '/#como-funciona' },
  { label: 'Testimonios',         href: '/#testimonios' },
  { label: 'Panel de proveedor',  href: '/login' },
];

const legalLinks = [
 // { label: 'Términos y condiciones', href: '/terminos' },
 // { label: 'Política de privacidad', href: '/privacidad' },
  { label: 'soporte@oficioapp.pe',   href: 'mailto:soporte@oficioapp.pe' },
];

export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-bg-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-10">

          {/* Marca */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <div className="relative w-8 h-8">
                <Image
                  src="/images/logo/logo_dark.png"
                  alt="OficioApp"
                  fill
                  className="object-contain"
                  sizes="32px"
                />
              </div>
              <span className="text-text-primary font-bold text-xl">OficioApp</span>
            </Link>
            <p className="text-text-muted text-sm leading-relaxed max-w-sm mb-4">
              El marketplace de servicios locales que conecta clientes con profesionales
              verificados en ciudades intermedias del Perú.
            </p>
            <a
              href="mailto:soporte@oficioapp.pe"
              className="text-text-muted text-xs hover:text-primary transition-colors"
            >
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
                    className="text-text-muted text-sm hover:text-primary transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-text-primary font-semibold text-xs mb-4 uppercase tracking-wider">
              Legal
            </h4>
            <ul className="space-y-2.5">
              {legalLinks.map((l) => (
                <li key={l.href}>
                  {l.href.startsWith('mailto:') ? (
                    <a
                      href={l.href}
                      className="text-text-muted text-sm hover:text-primary transition-colors"
                    >
                      {l.label}
                    </a>
                  ) : (
                    <Link
                      href={l.href}
                      className="text-text-muted text-sm hover:text-primary transition-colors"
                    >
                      {l.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Barra inferior */}
        <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-text-muted text-xs">
            © 2026 OficioApp. Todos los derechos reservados.
          </span>
          <span className="text-text-muted/50 text-xs">
            Hecho con ❤️ en Perú
          </span>
        </div>
      </div>
    </footer>
  );
}
