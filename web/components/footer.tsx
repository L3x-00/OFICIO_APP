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
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const },
  },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
  },
};

// ========== CONTENIDO LEGAL ==========
const TERMS_CONTENT = `TÉRMINOS Y CONDICIONES DE USO — Servi

Última actualización: Mayo 2026

1. ACEPTACIÓN DE LOS TÉRMINOS
Al acceder y utilizar la plataforma Servi, usted acepta estar sujeto a estos Términos y Condiciones de Uso. Si no está de acuerdo con alguno de estos términos, no utilice la plataforma.

2. DESCRIPCIÓN DEL SERVICIO
Servi es un marketplace de servicios locales que conecta a clientes con profesionales y negocios verificados en ciudades intermedias del Perú. La plataforma actúa exclusivamente como intermediario y no se hace responsable por la calidad de los servicios prestados por los profesionales registrados.

3. REGISTRO DE USUARIO
Para utilizar la plataforma, el usuario debe registrarse proporcionando información veraz y actualizada. El usuario es responsable de mantener la confidencialidad de su contraseña y de todas las actividades que ocurran bajo su cuenta.

4. VERIFICACIÓN DE PROFESIONALES
Servi realiza un proceso de verificación documental de los profesionales y negocios registrados. Sin embargo, esta verificación no constituye una garantía absoluta de la calidad o idoneidad de los servicios ofrecidos.

5. RESEÑAS Y CALIFICACIONES
Las reseñas deben ser honestas y basadas en experiencias reales. Servi se reserva el derecho de eliminar reseñas que contengan contenido falso, ofensivo o inapropiado.

6. PLANES DE SUSCRIPCIÓN
Los profesionales pueden acceder a planes gratuitos o de pago. Los precios, duración y beneficios de cada plan están detallados en la plataforma. Servi se reserva el derecho de modificar los precios con previo aviso.

7. SISTEMA DE REFERIDOS Y MONEDAS
Los usuarios pueden participar en el programa de referidos acumulando monedas virtuales. Estas monedas no tienen valor monetario real fuera de la plataforma y solo pueden canjearse por los beneficios especificados.

8. LIMITACIÓN DE RESPONSABILIDAD
Servi no será responsable por daños directos, indirectos, incidentales o consecuentes que resulten del uso o la imposibilidad de uso de la plataforma.

9. CONTACTO
Para cualquier consulta sobre estos términos, contáctenos a: soporteofiapp@gmail.com`;

const PRIVACY_CONTENT = `POLÍTICA DE PRIVACIDAD — Servi

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
      className="relative mt-20 border-t border-white/5 bg-dark-premium overflow-hidden"
    >
      {/* Fondo ambiental con grid y blob */}
      <div className="absolute inset-0 grid-bg opacity-20 pointer-events-none" aria-hidden />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/10 rounded-full blur-[160px] opacity-30 pointer-events-none" aria-hidden />

      {/* Línea de gradiente superior brillante */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 py-20">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid sm:grid-cols-2 lg:grid-cols-12 gap-12 mb-16"
        >
          {/* ─── Marca + redes ─── (Ocupa 4 columnas) */}
          <motion.div variants={itemVariants} className="lg:col-span-4">
            <Link href="/" className="flex items-center gap-3 mb-6 group w-fit">
              <div className="relative w-12 h-12 rounded-2xl gradient-border flex items-center justify-center bg-dark-card shadow-glow-sm transition-all duration-500 group-hover:shadow-glow-md group-hover:scale-110">
                <Image
                  src="/images/logo/servi.png"
                  alt="Servi"
                  width={26}
                  height={26}
                  className="object-contain"
                />
              </div>
              <span className="font-display font-bold text-2xl tracking-tightest text-gradient">
                Servi
              </span>
            </Link>
            <p className="text-white/50 text-[15px] leading-relaxed mb-8 max-w-sm">
              Encuentra al profesional ideal en minutos, no en horas. El marketplace peruano que garantiza seguridad y calidad en oficios y negocios locales.
            </p>

            <div className="flex items-center gap-3 mb-4 text-sm">
              <div className="w-8 h-8 rounded-lg glass flex items-center justify-center border border-white/10">
                <Mail size={14} className="text-primary-light" />
              </div>
              <a
                href="mailto:soporteofiapp@gmail.com"
                className="text-white/60 hover:text-primary-light transition-colors duration-300"
              >
                soporteofiapp@gmail.com
              </a>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-lg glass flex items-center justify-center border border-white/10">
                <MapPin size={14} className="text-primary-light" />
              </div>
              <span className="text-white/60">Perú</span>
            </div>

            {/* Redes Sociales - Estilo Premium Glass */}
            <div className="mt-8">
              <span className="chip-eyebrow mb-4">
                <span className="dot" />
                Síguenos
              </span>
              <div className="flex items-center gap-2">
                {[
                  { href: "https://mail.google.com/mail/?view=cm&fs=1&to=soporteofiapp@gmail.com", src: "/images/social/gmail.svg", alt: "Gmail" },
                  { href: "https://www.tiktok.com/@ofiapp.pe", src: "/images/social/tiktok.svg", alt: "TikTok" },
                  { href: "https://www.facebook.com/profile.php?id=61585849044376", src: "/images/social/facebook.svg", alt: "Facebook" },
                  { href: "https://www.instagram.com/ofiapp.pe/", src: "/images/social/instagram.svg", alt: "Instagram" }
                ].map((social) => (
                  <a
                    key={social.alt}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.alt}
                    className="w-10 h-10 rounded-xl glass glass-hover hover-lift press-effect flex items-center justify-center border border-white/10 group"
                  >
                    <img
                      src={social.src}
                      alt={social.alt}
                      className="w-5 h-5 object-contain opacity-50 group-hover:opacity-100 transition-opacity duration-300"
                    />
                  </a>
                ))}
              </div>
            </div>
          </motion.div>

          {/* ─── Explorar ─── (Ocupa 2 columnas) */}
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <h4 className="eyebrow mb-6 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-glow-sm" />
              Explorar
            </h4>
            <ul className="space-y-4">
              {productLinks.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="group/link text-white/60 text-[14.5px] hover:text-primary-light transition-all duration-300 inline-flex items-center gap-2"
                  >
                    <span className="w-0 h-px bg-primary-light transition-all duration-300 group-hover/link:w-3" />
                    <span className="relative">
                      {l.label}
                      <span className="absolute bottom-0 left-0 w-0 h-px bg-gradient-to-r from-primary to-accent transition-all duration-300 group-hover/link:w-full" />
                    </span>
                  </Link>
                </li>
              ))}
              <li>
                <button
                  onClick={() => setAboutOpen(true)}
                  className="group/link text-white/60 text-[14.5px] hover:text-primary-light transition-all duration-300 inline-flex items-center gap-2"
                >
                  <span className="w-0 h-px bg-primary-light transition-all duration-300 group-hover/link:w-3" />
                  <span className="relative">
                    Conócenos
                    <span className="absolute bottom-0 left-0 w-0 h-px bg-gradient-to-r from-primary to-accent transition-all duration-300 group-hover/link:w-full" />
                  </span>
                </button>
              </li>
            </ul>
          </motion.div>

          {/* ─── Contacto ─── (Ocupa 3 columnas) */}
          <motion.div variants={itemVariants} className="lg:col-span-3">
            <h4 className="eyebrow mb-6 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent shadow-glow-sm" />
              Contacto
            </h4>
            <ul className="space-y-4">
              {[
                { href: "https://mail.google.com/mail/?view=cm&fs=1&to=soporteofiapp@gmail.com", label: "Soporte técnico", icon: "🛡️" },
                { href: "https://mail.google.com/mail/?view=cm&fs=1&to=ronla.angarita31@gmail.com", label: "Ventas y planes", icon: "📈" },
                { href: "https://mail.google.com/mail/?view=cm&fs=1&to=dannyafk2000@gmail.com", label: "Centro de ayuda", icon: "💬" }
              ].map((contact) => (
                <li key={contact.label}>
                  <a
                    href={contact.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group/contact flex items-center gap-3 p-3 -ml-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all duration-300"
                  >
                    <span className="text-lg">{contact.icon}</span>
                    <div>
                      <span className="text-white/80 text-sm font-medium block group-hover/contact:text-primary-light transition-colors">
                        {contact.label}
                      </span>
                      <span className="text-white/40 text-xs">Respuesta en 24h</span>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* ─── Legal ─── (Ocupa 3 columnas) */}
          <motion.div variants={itemVariants} className="lg:col-span-3">
            <h4 className="eyebrow mb-6 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber shadow-glow-sm" />
              Legal
            </h4>
            <div className="glass rounded-2xl p-5 border border-white/5 space-y-3">
              <p className="text-white/40 text-xs leading-relaxed mb-4">
                El uso de Servi está sujeto a las siguientes políticas destinadas a proteger tu información y experiencia.
              </p>
              <button
                onClick={() =>
                  setLegalModal({
                    open: true,
                    title: 'Términos y Condiciones',
                    content: TERMS_CONTENT,
                  })
                }
                className="group/leg w-full text-left flex items-center justify-between p-2.5 -ml-2 rounded-lg hover:bg-white/5 transition-colors duration-200"
              >
                <span className="text-white/70 text-sm group-hover/leg:text-primary-light transition-colors">
                  Términos y condiciones
                </span>
                <ArrowUp size={12} className="text-white/30 rotate-45 group-hover/leg:text-primary-light transition-all" />
              </button>
              <button
                onClick={() =>
                  setLegalModal({
                    open: true,
                    title: 'Política de Privacidad',
                    content: PRIVACY_CONTENT,
                  })
                }
                className="group/leg w-full text-left flex items-center justify-between p-2.5 -ml-2 rounded-lg hover:bg-white/5 transition-colors duration-200"
              >
                <span className="text-white/70 text-sm group-hover/leg:text-primary-light transition-colors">
                  Política de privacidad
                </span>
                <ArrowUp size={12} className="text-white/30 rotate-45 group-hover/leg:text-primary-light transition-all" />
              </button>
            </div>
          </motion.div>
        </motion.div>

        {/* ─── Barra inferior ─── */}
        <motion.div
          variants={itemVariants}
          className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-6"
        >
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <span className="text-white/30 text-xs font-mono tabular-nums">
              © {year} Servi. Todos los derechos reservados.
            </span>
            <span className="hidden sm:block w-1 h-1 rounded-full bg-white/20" />
            <span className="text-white/40 text-xs inline-flex items-center gap-2">
              <span className="peru-stripe">
                <i />
                <i />
                <i />
              </span>
              Hecho con <Heart size={10} className="text-rose fill-rose" /> en Perú
            </span>
          </div>

          <button
            onClick={scrollToTop}
            className="group/btn flex items-center gap-2 text-white/40 text-xs font-display font-medium hover:text-primary-light transition-all duration-300 press-effect"
            aria-label="Volver arriba"
          >
            <span>Volver arriba</span>
            <div className="w-9 h-9 rounded-xl glass glass-hover flex items-center justify-center border border-white/10 group-hover/btn:border-primary/30 group-hover/btn:shadow-glow-sm transition-all duration-300 group-hover/btn:-translate-y-0.5">
              <ArrowUp size={14} />
            </div>
          </button>
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