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
  Image,
} from 'lucide-react';

/* ── Tipos ──────────────────────────────────── */

interface GuideStep {
  title: string;
  desc: string;
  icon: React.ElementType;
  color: string;
  screenshot?: string;
  links?: { label: string; href: string }[];
  subSteps?: string[];
}

interface GuideSection {
  id: string;
  title: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
  hoverBorder: string;
  content: GuideStep[];
}

/* ── Datos del manual ──────────────────────────────────── */

const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'cliente',
    title: 'Soy Cliente — Buscar y contratar',
    icon: Search,
    color: '#3B82F6',
    bg: 'bg-blue-500/5',
    border: 'border-blue-500/20',
    hoverBorder: 'hover:border-blue-400/40',
    content: [
      {
        title: 'Explora profesionales por categoría',
        desc: 'En la pantalla principal, usa los filtros de categoría, ubicación y rating para encontrar al profesional ideal.',
        icon: Search,
        color: '#3B82F6',
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
        color: '#10B981',
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
        color: '#F59E0B',
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
    color: '#E07B39',
    bg: 'bg-primary/5',
    border: 'border-primary/20',
    hoverBorder: 'hover:border-primary/40',
    content: [
      {
        title: 'Regístrate como Profesional',
        desc: 'Llena el formulario con DNI, teléfono, categoría, ubicación y fotos de tus trabajos.',
        icon: UserPlus,
        color: '#E07B39',
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
        color: '#E07B39',
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
        color: '#E07B39',
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
    color: '#8B5CF6',
    bg: 'bg-purple-500/5',
    border: 'border-purple-500/20',
    hoverBorder: 'hover:border-purple-400/40',
    content: [
      {
        title: 'Registra tu Negocio',
        desc: 'Ingresa RUC, Nombre Comercial, Razón Social y configura opciones de delivery.',
        icon: Store,
        color: '#8B5CF6',
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
        color: '#8B5CF6',
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
    color: '#F59E0B',
    bg: 'bg-amber-500/5',
    border: 'border-amber-500/20',
    hoverBorder: 'hover:border-amber-400/40',
    content: [
      {
        title: 'Consigue tu código de referido',
        desc: 'Cada usuario tiene un código único. Compártelo y gana monedas.',
        icon: Coins,
        color: '#F59E0B',
        screenshot: 'Sección de promociones con código de referido',
        subSteps: [
          'Ve a "Promociones" desde tu perfil o panel',
          'Copia tu código personal o comparte el enlace',
          'Recibes 50 monedas por cada registro aprobado',
          'Tu amigo recibe 5 monedas de bienvenida',
        ],
      },
      {
        title: 'Canjea tus monedas',
        desc: 'Acumula monedas y canjéalas por planes gratis o servicios reales.',
        icon: Crown,
        color: '#F59E0B',
        screenshot: 'Pantalla de canje de monedas con opciones disponibles',
        subSteps: [
          '500 monedas = Plan Estándar por 1 mes',
          '1000 monedas = Plan Premium por 2 meses',
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
    color: '#E07B39',
    bg: 'bg-primary/5',
    border: 'border-primary/20',
    hoverBorder: 'hover:border-primary/40',
    content: [
      {
        title: 'Planes disponibles',
        desc: 'OficioApp ofrece 3 planes: Gratis, Estándar y Premium.',
        icon: Crown,
        color: '#E07B39',
        screenshot: 'Comparativa de planes Gratis, Estándar y Premium',
        subSteps: [
          'Gratis: 3 servicios/productos, 3 fotos',
          'Estándar: 6 servicios/productos, 6 fotos, estadísticas',
          'Premium: ilimitado, máxima visibilidad, estadísticas avanzadas',
        ],
        links: [
          { label: 'Ver planes en panel web', href: '/login' },
        ],
      },
      {
        title: 'Cómo pagar con Yape',
        desc: 'Escanea el QR, sube tu comprobante y un código de verificación.',
        icon: Coins,
        color: '#E07B39',
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
        color: '#EF4444',
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
    color: '#10B981',
    bg: 'bg-green-500/5',
    border: 'border-green-500/20',
    hoverBorder: 'hover:border-green-400/40',
    content: [
      {
        title: 'Cambiar contraseña',
        desc: 'Actualiza tu contraseña desde la sección de Perfil.',
        icon: ShieldCheck,
        color: '#10B981',
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
        color: '#EF4444',
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
        color: '#10B981',
        screenshot: 'Formulario de reporte de problemas',
        subSteps: [
          'En tu perfil: "Reportar un problema"',
          'Describe el inconveniente y envía',
          'Panel profesional: "Ajustes" > "Reportar problema"',
          'También puedes escribir a soporte',
        ],
        links: [
          { label: 'Soporte técnico', href: 'mailto:soporteofiapp@gmail.com' },
        ],
      },
    ],
  },
];

/* ── Componente de tarjeta individual ────────────────────────────────── */

function GuideCard({ section }: { section: GuideSection }) {
  const [isActive, setIsActive] = useState(false);

  const Icon = section.icon;

  return (
    <div
      className={`user-guide-card group relative rounded-2xl border ${section.border} ${section.bg} ${section.hoverBorder} transition-all duration-300`}
    >
      {/* Cabecera clickeable */}
      <button
        onClick={() => setIsActive((prev) => !prev)}
        className="w-full text-left px-5 py-5 flex items-center gap-4"
      >
        {/* Icono con animación sutil */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-105"
          style={{ backgroundColor: `${section.color}20` }}
        >
          <Icon size={22} style={{ color: section.color }} />
        </div>

        {/* Título y contador */}
        <div className="flex-1 min-w-0">
          <h3
            className="font-bold text-sm sm:text-base transition-colors duration-300"
            style={{ color: section.color }}
          >
            {section.title}
          </h3>
          <p className="text-text-muted text-xs mt-1">
            {section.content.length} {section.content.length === 1 ? 'guía' : 'guías'}
          </p>
        </div>

        {/* Flecha que rota */}
        <ChevronDown
          size={18}
          className={`text-text-muted flex-shrink-0 transition-transform duration-300 ${
            isActive ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Contenido desplegable - SOLO si está activo */}
      {isActive && (
        <div className="px-5 pb-5 space-y-5 border-t border-white/10 pt-5 guide-content-enter">
          {section.content.map((step, i) => {
            const StepIcon = step.icon;
            return (
              <div
                key={i}
                className="bg-bg-card border border-white/10 rounded-xl p-4 hover:border-white/20 transition-all duration-200"
              >
                <div className="flex items-start gap-3">
                  {/* Icono del paso */}
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: `${step.color}18` }}
                  >
                    <StepIcon size={16} style={{ color: step.color }} />
                  </div>

                  {/* Contenido del paso */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-text-primary font-semibold text-sm">{step.title}</h4>
                    <p className="text-text-secondary text-xs leading-relaxed mt-1.5">{step.desc}</p>

                    {/* CAPTURA DE PANTALLA */}
                    {step.screenshot && (
                      <div className="mt-3 bg-bg-input/40 border border-white/10 border-dashed rounded-lg p-4 text-center group/screenshot cursor-pointer hover:border-primary/30 transition-all duration-200">
                        <div className="flex flex-col items-center gap-2">
                          <Image size={24} className="text-text-muted group-hover/screenshot:text-primary transition-colors duration-200" />
                          <p className="text-text-muted text-xs font-medium">📸 {step.screenshot}</p>
                          <span className="text-[10px] text-text-muted/60">
                            (Espacio para captura de pantalla real)
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Sub-pasos */}
                    {step.subSteps && step.subSteps.length > 0 && (
                      <ul className="mt-3 space-y-1.5">
                        {step.subSteps.map((s, j) => (
                          <li key={j} className="text-text-muted text-xs flex items-start gap-2">
                            <span
                              className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                              style={{ backgroundColor: step.color }}
                            />
                            {s}
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Enlaces */}
                    {step.links && step.links.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {step.links.map((link, k) => (
                          <a
                            key={k}
                            href={link.href}
                            target={link.href.startsWith('http') ? '_blank' : undefined}
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-white/10 hover:border-primary/40 text-text-secondary hover:text-primary transition-all duration-200"
                          >
                            {link.href.startsWith('http') || link.href.startsWith('mailto') ? (
                              <ExternalLink size={12} />
                            ) : (
                              <ArrowRight size={12} />
                            )}
                            {link.label}
                          </a>
                        ))}
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

/* ── Componente principal ────────────────────────────────── */

export default function UserGuideSection() {
  return (
    <section id="guia" className="py-20 sm:py-28 bg-bg-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ── Encabezado ── */}
        <div className="text-center mb-14" data-reveal>
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/25 rounded-full px-4 py-1.5 mb-4">
            <BookOpen size={14} className="text-primary" />
            <span className="text-primary text-xs font-bold uppercase tracking-widest">
              Manual de usuario
            </span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-text-primary leading-tight">
            Aprende a usar{' '}
            <span className="text-gradient">OficioApp</span>
          </h2>
          <p className="text-text-secondary mt-4 max-w-xl mx-auto text-lg">
            Todo lo que necesitas saber para aprovechar al máximo la plataforma,
            tanto si eres cliente como si eres profesional o negocio.
          </p>
        </div>

        {/* ── Grid de tarjetas: 2 columnas × 3 filas = 6 tarjetas ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {GUIDE_SECTIONS.map((section) => (
            <div key={section.id} data-reveal>
              <GuideCard section={section} />
            </div>
          ))}
        </div>

        {/* ── Nota al pie ── */}
        <div className="mt-12 text-center" data-reveal>
          <p className="text-text-muted text-xs max-w-lg mx-auto leading-relaxed">
            Si después de leer este manual aún tienes dudas, no dudes en contactarnos.
            Estamos aquí para ayudarte a sacar el máximo provecho de OficioApp.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-5">
            <a
              href="mailto:soporteofiapp@gmail.com"
              className="btn-ghost press-effect inline-flex items-center gap-2 px-5 py-2 rounded-xl font-semibold text-sm"
            >
              <Headphones size={14} />
              Soporte técnico
            </a>
            <a
              href="mailto:ronla.angarita31@gmail.com"
              className="btn-ghost press-effect inline-flex items-center gap-2 px-5 py-2 rounded-xl font-semibold text-sm"
            >
              <Download size={14} />
              Ventas y planes
            </a>
            <a
              href="#"
              className="btn-primary press-effect inline-flex items-center gap-2 px-5 py-2 rounded-xl font-semibold text-sm"
            >
              <ExternalLink size={14} />
              Descargar la app
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}