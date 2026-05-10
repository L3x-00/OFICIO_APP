'use client';

import { useState } from 'react';
import {
  Search,
  MessageCircle,
  Star,
  BookOpen,
  UserPlus,
  Store,
  Coins,
  Crown,
  ShieldCheck,
  Headphones,
  Trash2,
  Camera,
  ArrowRight,
  Download,
  ExternalLink,
  ChevronDown,
  Image as ImageIcon,
} from 'lucide-react';

interface GuideStep {
  title: string;
  desc: string;
  icon: React.ElementType;
  accent: keyof typeof ACCENT;
  screenshot?: string;
  links?: { label: string; href: string }[];
  subSteps?: string[];
}

interface GuideSection {
  id: string;
  title: string;
  icon: React.ElementType;
  accent: keyof typeof ACCENT;
  content: GuideStep[];
}

const ACCENT = {
  blue:   { bg: 'bg-[#E0EAFB]',  text: 'text-[#1E40AF]',     border: 'border-[#C2D5F5]', dot: 'bg-[#3B82F6]' },
  orange: { bg: 'bg-[#FBE8D6]',  text: 'text-primary-darker', border: 'border-[#F4CDA3]', dot: 'bg-primary' },
  purple: { bg: 'bg-[#EBE0FB]',  text: 'text-[#5B21B6]',     border: 'border-[#D6C4F2]', dot: 'bg-[#8B5CF6]' },
  amber:  { bg: 'bg-[#FBEFCD]',  text: 'text-[#7A4C00]',     border: 'border-[#EBCF8A]', dot: 'bg-amber' },
  green:  { bg: 'bg-[#E2F5EC]',  text: 'text-[#0E5C3D]',     border: 'border-[#B8E3CD]', dot: 'bg-green' },
  rose:   { bg: 'bg-[#FBE0E3]',  text: 'text-[#9B1C28]',     border: 'border-[#F2BFC4]', dot: 'bg-rose' },
} as const;

const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'cliente',
    title: 'Soy Cliente — Buscar y contratar',
    icon: Search,
    accent: 'blue',
    content: [
      {
        title: 'Explora profesionales por categoría',
        desc: 'En la pantalla principal, usa los filtros de categoría, ubicación y rating para encontrar al profesional ideal.',
        icon: Search,
        accent: 'blue',
        screenshot: 'Pantalla de exploración con filtros de categoría y ubicación',
        subSteps: [
          'Selecciona una categoría (electricista, gasfitero, chef, etc.)',
          'Filtra por departamento, provincia y distrito',
          'Ordena por rating o por plan (Premium primero)',
        ],
      },
      {
        title: 'Contacta directamente',
        desc: 'Cada tarjeta muestra WhatsApp y teléfono. Toca el botón verde para iniciar una conversación.',
        icon: MessageCircle,
        accent: 'green',
        screenshot: 'Tarjeta de proveedor con botones de WhatsApp y teléfono',
        subSteps: [
          'Toca el ícono de WhatsApp para enviar un mensaje',
          'Toca el ícono de teléfono para llamar directamente',
          'También puedes ver la ubicación en el mapa',
        ],
      },
      {
        title: 'Califica el servicio',
        desc: 'Después del servicio, deja una reseña con estrellas, comentario y foto.',
        icon: Star,
        accent: 'amber',
        screenshot: 'Formulario de reseña con estrellas, comentario y foto',
        subSteps: [
          'Toca "Escribir reseña" en el perfil del proveedor',
          'Califica de 1 a 5 estrellas',
          'Añade un comentario y una foto (opcional)',
          'Tu reseña queda geolocalizada con GPS',
        ],
      },
    ],
  },
  {
    id: 'profesional',
    title: 'Soy Profesional Independiente',
    icon: UserPlus,
    accent: 'orange',
    content: [
      {
        title: 'Regístrate como Profesional',
        desc: 'Llena el formulario con DNI, teléfono, categoría, ubicación y fotos de tus trabajos.',
        icon: UserPlus,
        accent: 'orange',
        screenshot: 'Formulario de registro de profesional independiente',
        subSteps: [
          'Elige un nombre para tu servicio',
          'Ingresa tu DNI (8 dígitos)',
          'Selecciona categoría y subcategoría',
          'Establece tu ubicación',
          'Sube fotos de tus trabajos anteriores',
        ],
        links: [
          { label: 'Descargar la app', href: '#' },
          { label: 'Ir al panel web', href: '/login' },
        ],
      },
      {
        title: 'Configura tu perfil',
        desc: 'Edita información, añade servicios, redes sociales y horarios de atención.',
        icon: Camera,
        accent: 'orange',
        screenshot: 'Panel de edición de perfil profesional',
        subSteps: [
          'Ve a "Perfil" en tu panel',
          'Añade una descripción detallada',
          'Configura tu horario por días',
          'Añade tus redes sociales',
          'Cambia tu disponibilidad',
        ],
      },
      {
        title: 'Gestiona tus servicios',
        desc: 'Añade los servicios que ofreces según tu plan contratado.',
        icon: BookOpen,
        accent: 'orange',
        screenshot: 'Lista de servicios con botón para añadir nuevo',
        subSteps: [
          'Toca "Añadir servicio"',
          'Escribe nombre y descripción',
          'Guarda y repite para cada servicio',
          'Considera subir de plan si llegas al límite',
        ],
      },
    ],
  },
  {
    id: 'negocio',
    title: 'Tengo un Negocio',
    icon: Store,
    accent: 'purple',
    content: [
      {
        title: 'Registra tu Negocio',
        desc: 'Ingresa RUC, Nombre Comercial, Razón Social y configura opciones de delivery.',
        icon: Store,
        accent: 'purple',
        screenshot: 'Formulario de registro de negocio con campos RUC y delivery',
        subSteps: [
          'Ingresa el RUC de tu negocio (11 dígitos)',
          'Escribe tu Nombre Comercial',
          'Escribe tu Razón Social (registro SUNAT)',
          'Activa el toggle de Delivery si realizas envíos',
          'Si tienes delivery, activa "Coordinación full" si aplica',
        ],
        links: [
          { label: 'Descargar la app', href: '#' },
          { label: 'Ir al panel web', href: '/login' },
        ],
      },
      {
        title: 'Añade productos',
        desc: 'Agrega los productos que vendes con su precio en soles (S/.).',
        icon: BookOpen,
        accent: 'purple',
        screenshot: 'Lista de productos con precios y botón para añadir',
        subSteps: [
          'Ve a "Productos" en tu panel',
          'Toca "Añadir producto"',
          'Escribe nombre, descripción y precio en S/.',
          'El precio se mostrará en tu tarjeta pública',
        ],
      },
    ],
  },
  {
    id: 'monedas',
    title: 'Sistema de Monedas y Referidos',
    icon: Coins,
    accent: 'amber',
    content: [
      {
        title: 'Consigue tu código de referido',
        desc: 'Cada usuario tiene un código único. Compártelo y gana monedas.',
        icon: Coins,
        accent: 'amber',
        screenshot: 'Sección de promociones con código de referido',
        subSteps: [
          'Ve a "Promociones" desde tu perfil o panel',
          'Copia tu código personal o comparte el enlace',
          'Recibes 25 monedas por cada registro aprobado',
          'Tu amigo recibe 5 monedas de bienvenida',
        ],
      },
      {
        title: 'Canjea tus monedas',
        desc: 'Acumula monedas y canjéalas por planes gratis o servicios reales.',
        icon: Crown,
        accent: 'amber',
        screenshot: 'Pantalla de canje de monedas con opciones disponibles',
        subSteps: [
          '1000 monedas = Plan Estándar por 1 mes',
          '2000 monedas = Plan Premium por 2 meses',
          'También puedes canjear por servicios reales',
          'Ve a "Canjear monedas" para ver las opciones',
        ],
      },
    ],
  },
  {
    id: 'planes',
    title: 'Planes y Suscripciones',
    icon: Crown,
    accent: 'orange',
    content: [
      {
        title: 'Planes disponibles',
        desc: 'OficioApp ofrece 3 planes: Gratis, Estándar y Premium.',
        icon: Crown,
        accent: 'orange',
        screenshot: 'Comparativa de planes Gratis, Estándar y Premium',
        subSteps: [
          'Gratis: 3 servicios/productos, 3 fotos',
          'Estándar: 6 servicios/productos, 6 fotos, estadísticas',
          'Premium: ilimitado, máxima visibilidad, estadísticas avanzadas',
        ],
        links: [{ label: 'Ver planes en panel web', href: '/login' }],
      },
      {
        title: 'Cómo pagar con Yape',
        desc: 'Escanea el QR, sube tu comprobante y un código de verificación.',
        icon: Coins,
        accent: 'orange',
        screenshot: 'Pantalla de pago con QR de Yape y campos de comprobante',
        subSteps: [
          'Ve a "Ajustes" > "Ver planes disponibles"',
          'Elige Estándar o Premium y toca "Adquirir"',
          'Escanea el QR con Yape y paga el monto exacto',
          'Sube captura del comprobante',
          'Ingresa el código de verificación de 3 dígitos',
          'El admin revisará y activará tu plan',
        ],
      },
      {
        title: 'Cancelar un plan',
        desc: 'Puedes cancelar tu plan activo desde Ajustes cuando lo desees.',
        icon: Trash2,
        accent: 'rose',
        screenshot: 'Sección de suscripción con botón de cancelar plan',
        subSteps: [
          'Ve a "Ajustes" en tu panel',
          'En suscripción, toca "Cancelar plan"',
          'Confirma la cancelación',
          'Tu plan pasará a estado cancelado',
        ],
      },
    ],
  },
  {
    id: 'cuenta',
    title: 'Gestión de Cuenta',
    icon: ShieldCheck,
    accent: 'green',
    content: [
      {
        title: 'Cambiar contraseña',
        desc: 'Actualiza tu contraseña desde la sección de Perfil.',
        icon: ShieldCheck,
        accent: 'green',
        screenshot: 'Formulario de cambio de contraseña',
        subSteps: [
          'Ve a "Perfil" > "Cambiar contraseña"',
          'Ingresa tu contraseña actual',
          'Ingresa la nueva contraseña y confírmala',
          'Guarda los cambios',
        ],
      },
      {
        title: 'Eliminar cuenta',
        desc: 'Elimina permanentemente tu cuenta y todos tus datos.',
        icon: Trash2,
        accent: 'rose',
        screenshot: 'Pantalla de confirmación para eliminar cuenta',
        subSteps: [
          'Ve a "Perfil" > "Eliminar cuenta"',
          'Lee la advertencia (acción irreversible)',
          'Escribe "ELIMINAR" para confirmar',
          'Toca "Eliminar cuenta"',
          'Todos tus datos serán borrados',
        ],
      },
      {
        title: 'Reportar un problema',
        desc: 'Reporta bugs, sugerencias o problemas con algún proveedor.',
        icon: Headphones,
        accent: 'green',
        screenshot: 'Formulario de reporte de problemas',
        subSteps: [
          'En tu perfil: "Reportar un problema"',
          'Describe el inconveniente y envía',
          'Panel profesional: "Ajustes" > "Reportar problema"',
          'También puedes escribir a soporte',
        ],
        links: [{ label: 'Soporte técnico', href: 'mailto:soporteofiapp@gmail.com' }],
      },
    ],
  },
];

function GuideCard({ section }: { section: GuideSection }) {
  const [open, setOpen] = useState(false);
  const Icon = section.icon;
  const a = ACCENT[section.accent];

  return (
    <div className="user-guide-card group relative card-3d overflow-hidden">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full text-left px-6 py-5 flex items-center gap-4"
      >
        <div className={`w-11 h-11 rounded-xl border ${a.border} ${a.bg} flex items-center justify-center flex-shrink-0`}>
          <Icon size={20} strokeWidth={1.75} className={a.text} />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold text-ink text-[15.5px] leading-snug">
            {section.title}
          </h3>
          <p className="text-ink-4 text-xs mt-1">
            {section.content.length} {section.content.length === 1 ? 'guía' : 'guías'}
          </p>
        </div>

        <ChevronDown
          size={18}
          strokeWidth={1.75}
          className={`text-ink-4 flex-shrink-0 transition-transform duration-300 ${open ? 'rotate-180 text-ink' : ''}`}
        />
      </button>

      {open && (
        <div className="px-6 pb-6 space-y-4 border-t border-line pt-5 guide-content-enter">
          {section.content.map((step, i) => {
            const StepIcon = step.icon;
            const sa = ACCENT[step.accent];
            return (
              <div key={i} className="card-flat p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-lg border ${sa.border} ${sa.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    <StepIcon size={15} strokeWidth={1.75} className={sa.text} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="font-display font-semibold text-ink text-[14px]">
                      {step.title}
                    </h4>
                    <p className="text-ink-3 text-[13px] leading-relaxed mt-1">
                      {step.desc}
                    </p>

                    {step.screenshot && (
                      <div className="mt-3 bg-paper border border-dashed border-line-2 rounded-lg p-4 text-center hover:border-primary/40 transition-colors duration-200">
                        <div className="flex flex-col items-center gap-1.5">
                          <ImageIcon size={20} className="text-ink-4" strokeWidth={1.75} />
                          <p className="text-ink-3 text-[12px] font-medium">{step.screenshot}</p>
                          <span className="text-[10px] text-ink-5">
                            (Espacio para captura real)
                          </span>
                        </div>
                      </div>
                    )}

                    {step.subSteps && step.subSteps.length > 0 && (
                      <ul className="mt-3 space-y-1.5">
                        {step.subSteps.map((s, j) => (
                          <li key={j} className="text-ink-3 text-[12.5px] flex items-start gap-2 leading-relaxed">
                            <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${sa.dot}`} />
                            {s}
                          </li>
                        ))}
                      </ul>
                    )}

                    {step.links && step.links.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {step.links.map((link, k) => {
                          const ext = link.href.startsWith('http') || link.href.startsWith('mailto');
                          return (
                            <a
                              key={k}
                              href={link.href}
                              target={ext ? '_blank' : undefined}
                              rel="noopener noreferrer"
                              className="btn btn-ghost btn-sm press-effect"
                            >
                              {ext ? <ExternalLink size={12} /> : <ArrowRight size={12} />}
                              {link.label}
                            </a>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function UserGuideSection() {
  return (
    <section id="guia" className="py-24 sm:py-32 bg-paper">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">

        <div className="max-w-2xl mb-14 sm:mb-16" data-reveal>
          <span className="eyebrow">Manual de usuario</span>
          <h2 className="mt-3 font-display font-bold tracking-tightest text-ink text-[34px] sm:text-[44px] leading-[1.1]">
            Aprende a usar OficioApp.
          </h2>
          <p className="mt-4 text-ink-3 text-[16px] leading-relaxed max-w-xl">
            Todo lo que necesitas saber para aprovechar al máximo la plataforma,
            tanto si eres cliente como si eres profesional o negocio.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {GUIDE_SECTIONS.map((section) => (
            <div key={section.id} data-reveal>
              <GuideCard section={section} />
            </div>
          ))}
        </div>

        <div className="mt-16 text-center" data-reveal>
          <p className="text-ink-4 text-[13px] max-w-lg mx-auto leading-relaxed">
            Si después de leer este manual aún tienes dudas, contáctanos.
            Estamos aquí para ayudarte.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            <a href="mailto:soporteofiapp@gmail.com" className="btn btn-ghost btn-sm press-effect">
              <Headphones size={14} />
              Soporte técnico
            </a>
            <a href="mailto:ronla.angarita31@gmail.com" className="btn btn-ghost btn-sm press-effect">
              <Download size={14} />
              Ventas y planes
            </a>
            <a href="#" className="btn btn-ink btn-sm press-effect">
              <ExternalLink size={14} />
              Descargar la app
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
