'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, ArrowUp, Mail, Phone, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import LegalModal from '@/components/legal-modal';
import AboutModal from '@/components/about-modal';

// ========== ANIMACIONES TIPADAS ==========
const footerVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
  },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { y: 15, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const },
  },
};

// ========== CONTENIDO LEGAL ==========
const TERMS_CONTENT = `TÉRMINOS Y CONDICIONES DE USO — OficioApp

Última actualización: Mayo 2026

1. ACEPTACIÓN DE LOS TÉRMINOS
Al acceder y utilizar la plataforma OficioApp, usted acepta estar sujeto a estos Términos y Condiciones de Uso. Si no está de acuerdo con alguno de estos términos, no utilice la plataforma.

2. DESCRIPCIÓN DEL SERVICIO
OficioApp es un marketplace de servicios locales que conecta a clientes con profesionales y negocios verificados en ciudades intermedias del Perú. La plataforma actúa exclusivamente como intermediario y no se hace responsable por la calidad de los servicios prestados por los profesionales registrados.

3. REGISTRO DE USUARIO
Para utilizar la plataforma, el usuario debe registrarse proporcionando información veraz y actualizada. El usuario es responsable de mantener la confidencialidad de su contraseña y de todas las actividades que ocurran bajo su cuenta.

4. VERIFICACIÓN DE PROFESIONALES
OficioApp realiza un proceso de verificación documental de los profesionales y negocios registrados. Sin embargo, esta verificación no constituye una garantía absoluta de la calidad o idoneidad de los servicios ofrecidos.

5. RESEÑAS Y CALIFICACIONES
Las reseñas deben ser honestas y basadas en experiencias reales. OficioApp se reserva el derecho de eliminar reseñas que contengan contenido falso, ofensivo o inapropiado.

6. PLANES DE SUSCRIPCIÓN
Los profesionales pueden acceder a planes gratuitos o de pago. Los precios, duración y beneficios de cada plan están detallados en la plataforma. OficioApp se reserva el derecho de modificar los precios con previo aviso.

7. SISTEMA DE REFERIDOS Y MONEDAS
Los usuarios pueden participar en el programa de referidos acumulando monedas virtuales. Estas monedas no tienen valor monetario real fuera de la plataforma y solo pueden canjearse por los beneficios especificados.

8. LIMITACIÓN DE RESPONSABILIDAD
OficioApp no será responsable por daños directos, indirectos, incidentales o consecuentes que resulten del uso o la imposibilidad de uso de la plataforma.

9. CONTACTO
Para cualquier consulta sobre estos términos, contáctenos a: soporteofiapp@gmail.com`;

const PRIVACY_CONTENT = `POLÍTICA DE PRIVACIDAD — OficioApp

Última actualización: Mayo 2026

1. INFORMACIÓN QUE RECOPILAMOS
Recopilamos información personal como nombre, correo electrónico, número de teléfono, ubicación geográfica y fotografías de perfil. Para los profesionales, también recopilamos documentos de verificación como DNI, RUC y comprobantes de pago.

2. USO DE LA INFORMACIÓN
La información recopilada se utiliza para:
- Crear y gestionar cuentas de usuario
- Verificar la identidad de los profesionales
- Facilitar la conexión entre clientes y proveedores
- Enviar notificaciones relacionadas con el servicio
- Mejorar la experiencia de usuario

3. PROTECCIÓN DE DATOS
Implementamos medidas de seguridad técnicas y organizativas para proteger sus datos personales contra accesos no autorizados, alteraciones, divulgaciones o destrucciones.

4. COMPARTIR INFORMACIÓN
No vendemos, intercambiamos ni transferimos su información personal a terceros sin su consentimiento, excepto cuando sea necesario para proporcionar el servicio solicitado o por requerimiento legal.

5. COOKIES Y TECNOLOGÍAS SIMILARES
Utilizamos cookies para mejorar la experiencia de navegación, analizar el tráfico y personalizar el contenido. Puede configurar su navegador para rechazar cookies.

6. ALMACENAMIENTO DE DATOS
Sus datos se almacenan en servidores seguros ubicados en Estados Unidos a través de servicios como Supabase, Cloudflare R2 y Render.

7. DERECHOS DEL USUARIO
Usted tiene derecho a:
- Acceder a sus datos personales
- Rectificar datos inexactos
- Solicitar la eliminación de su cuenta y datos asociados
- Oponerse al tratamiento de sus datos

8. CONTACTO
Para ejercer sus derechos o consultar sobre esta política: soporteofiapp@gmail.com`;

const productLinks = [
  { label: 'Beneficios', href: '/#beneficios' },
  { label: 'Cómo funciona', href: '/#como-funciona' },
  { label: 'Testimonios', href: '/#testimonios' },
  { label: 'Manual de usuario', href: '/#guia' },
  { label: 'Panel de proveedor', href: '/login' },
];

export default function Footer() {
  const year = new Date().getFullYear();
  const [legalModal, setLegalModal] = useState<{ open: boolean; title: string; content: string }>({
    open: false,
    title: '',
    content: '',
  });
  const [aboutOpen, setAboutOpen] = useState(false);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <motion.footer
      variants={footerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-50px' }}
      className="relative mt-20 border-t border-white/10 bg-dark-premium/80 backdrop-blur-xl"
    >
      {/* Degradado superior sutil */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 py-16">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-12 mb-12"
        >
          {/* Marca + redes */}
          <motion.div variants={itemVariants} className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="flex items-center gap-3 mb-5 group w-fit">
              <div className="relative w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shadow-glow-sm transition-all duration-300 group-hover:shadow-glow-md group-hover:scale-105 border border-white/10">
                <Image
                  src="/images/logo/logo_light.png"
                  alt="OficioApp"
                  width={24}
                  height={24}
                  className="object-contain"
                />
              </div>
              <span className="font-display font-bold text-white text-xl tracking-tightest bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                OficioApp
              </span>
            </Link>
            <p className="text-white/50 text-sm leading-relaxed mb-6 max-w-xs">
              Encuentra al profesional ideal en minutos, no en horas. El marketplace peruano que garantiza seguridad y calidad en oficios y negocios locales.
            </p>

            <div className="flex items-center gap-2 mb-4">
              <Mail size={14} className="text-white/30" />
              <a
                href="mailto:soporteofiapp@gmail.com"
                className="text-white/50 text-xs hover:text-primary-light transition-colors"
              >
                soporteofiapp@gmail.com
              </a>
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={14} className="text-white/30" />
              <span className="text-white/40 text-xs">Perú</span>
            </div>

            <span className="eyebrow block mt-6 mb-3">Síguenos</span>
              <div className="flex items-center gap-2">
                <SocialIcon
                  href="https://mail.google.com/mail/?view=cm&fs=1&to=soporteofiapp@gmail.com"
                  label="Gmail"
                  color="#EA4335"
                >
                  <GmailIcon />
                </SocialIcon>
                <SocialIcon
                  href="https://www.tiktok.com/@ofiapp.pe"
                  label="TikTok"
                  color="#00F2EA"
                >
                  <TikTokIcon />
                </SocialIcon>
                <SocialIcon
                  href="https://www.facebook.com/profile.php?id=61585849044376"
                  label="Facebook"
                  color="#1877F2"
                >
                  <FacebookIcon />
                </SocialIcon>
                <SocialIcon
                  href="https://www.instagram.com/ofiapp.pe/"
                  label="Instagram"
                  color="#E4405F"
                >
                  <InstagramIcon />
                </SocialIcon>
              </div>
          </motion.div>

          {/* Explorar */}
          <motion.div variants={itemVariants}>
            <h4 className="eyebrow mb-4">Explorar</h4>
            <ul className="space-y-2.5">
              {productLinks.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-white/60 text-sm hover:text-primary-light transition-colors duration-200 hover:translate-x-1 inline-block"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
              <li>
                <button
                  onClick={() => setAboutOpen(true)}
                  className="text-white/60 text-sm hover:text-primary-light transition-colors duration-200 hover:translate-x-1 inline-block"
                >
                  Conócenos
                </button>
              </li>
            </ul>
          </motion.div>

          {/* Contacto */}
          <motion.div variants={itemVariants}>
            <h4 className="eyebrow mb-4">Contacto</h4>
            <ul className="space-y-2.5">
              <li>
                <a
                  href="https://mail.google.com/mail/?view=cm&fs=1&to=soporteofiapp@gmail.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/60 text-sm hover:text-primary-light transition-colors duration-200 hover:translate-x-1 inline-flex items-center gap-1.5"
                >
                  <Mail size={12} />
                  Soporte técnico
                </a>
              </li>
              <li>
                <a
                  href="https://mail.google.com/mail/?view=cm&fs=1&to=ronla.angarita31@gmail.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/60 text-sm hover:text-primary-light transition-colors duration-200 hover:translate-x-1 inline-flex items-center gap-1.5"
                >
                  <Mail size={12} />
                  Ventas y planes
                </a>
              </li>
              <li>
                <a
                  href="https://mail.google.com/mail/?view=cm&fs=1&to=dannyafk2000@gmail.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/60 text-sm hover:text-primary-light transition-colors duration-200 hover:translate-x-1 inline-flex items-center gap-1.5"
                >
                  <Mail size={12} />
                  Centro de ayuda
                </a>
              </li>
            </ul>
          </motion.div>

          {/* Legal */}
          <motion.div variants={itemVariants}>
            <h4 className="eyebrow mb-4">Legal</h4>
            <ul className="space-y-2.5">
              <li>
                <button
                  onClick={() =>
                    setLegalModal({
                      open: true,
                      title: 'Términos y Condiciones',
                      content: TERMS_CONTENT,
                    })
                  }
                  className="text-white/60 text-sm hover:text-primary-light transition-colors duration-200 hover:translate-x-1 inline-block"
                >
                  Términos y condiciones
                </button>
              </li>
              <li>
                <button
                  onClick={() =>
                    setLegalModal({
                      open: true,
                      title: 'Política de Privacidad',
                      content: PRIVACY_CONTENT,
                    })
                  }
                  className="text-white/60 text-sm hover:text-primary-light transition-colors duration-200 hover:translate-x-1 inline-block"
                >
                  Política de privacidad
                </button>
              </li>
            </ul>
          </motion.div>
        </motion.div>

        {/* Barra inferior con botón de scroll up */}
        <motion.div
          variants={itemVariants}
          className="pt-7 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <span className="text-white/30 text-xs">
            © {year} OficioApp. Todos los derechos reservados.
          </span>
          <div className="flex items-center gap-4">
            <span className="text-white/30 text-xs inline-flex items-center gap-1.5">
              <span className="peru-stripe">
                <i />
                <i />
                <i />
              </span>
              Hecho con <Heart size={10} className="text-rose fill-rose" /> en Perú
            </span>
            <button
              onClick={scrollToTop}
              className="w-8 h-8 rounded-full glass flex items-center justify-center text-white/50 hover:text-primary-light hover:shadow-glow-sm transition-all hover:scale-105"
              aria-label="Volver arriba"
            >
              <ArrowUp size={14} />
            </button>
          </div>
        </motion.div>
      </div>

      <LegalModal
        isOpen={legalModal.open}
        onClose={() => setLegalModal({ open: false, title: '', content: '' })}
        title={legalModal.title}
        content={legalModal.content}
      />
      <AboutModal isOpen={aboutOpen} onClose={() => setAboutOpen(false)} />
    </motion.footer>
  );
}

// Componente para íconos sociales (mejor hover)
// ── Íconos SVG inline de redes sociales ────────────────
function SocialIcon({ href, label, color, children }: { href: string; label: string; color: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="w-9 h-9 rounded-lg glass flex items-center justify-center border border-white/10 hover:border-primary/40 hover:shadow-glow-sm transition-all duration-200 hover:scale-110 group"
      style={{ color: color ? '' : 'inherit' }}
    >
      <span className="w-5 h-5 flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity" style={{ color }}>
        {children}
      </span>
    </a>
  );
}

// SVG inline para Gmail
function GmailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
      <path d="M2 6l10 7 10-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" fill="none" />
    </svg>
  );
}

// SVG inline para TikTok
function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
      <path
        d="M17.5 4h-2.3c-.4 1.8-1.6 3-3.5 3.2v2.2c1.4-.1 2.7-.5 3.8-1.3v5.6c0 2.9-2.4 5.3-5.3 5.3S4.9 16.7 4.9 13.8s2.4-5.3 5.3-5.3c.2 0 .4 0 .6.1v2.5c-.2 0-.4-.1-.6-.1-1.5 0-2.8 1.2-2.8 2.8s1.3 2.8 2.8 2.8 2.8-1.2 2.8-2.8V4z"
        stroke="currentColor"
        strokeWidth="1.6"
        fill="none"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// SVG inline para Facebook
function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
      <path
        d="M18 2h-3c-2.8 0-5 2.2-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7c0-.6.4-1 1-1h3V2z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

// SVG inline para Instagram
function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
      <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="1.8" fill="none" />
      <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.8" fill="none" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
    </svg>
  );
}