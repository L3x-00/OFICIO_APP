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
                  alt="Servi"
                  width={24}
                  height={24}
                  className="object-contain"
                />
              </div>
              <span className="font-display font-bold text-white text-xl tracking-tightest bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                Servi
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
              <a
                href="https://mail.google.com/mail/?view=cm&fs=1&to=soporteofiapp@gmail.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Gmail"
                className="w-9 h-9 rounded-lg glass flex items-center justify-center border border-white/10 hover:border-primary/40 hover:shadow-glow-sm transition-all duration-200 hover:scale-110 group"
              >
                <img
                  src="/images/social/gmail.svg"
                  alt="Gmail"
                  className="w-5 h-5 object-contain opacity-60 group-hover:opacity-100 transition-opacity"
                />
              </a>
              <a
                href="https://www.tiktok.com/@ofiapp.pe"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                className="w-9 h-9 rounded-lg glass flex items-center justify-center border border-white/10 hover:border-primary/40 hover:shadow-glow-sm transition-all duration-200 hover:scale-110 group"
              >
                <img
                  src="/images/social/tiktok.svg"
                  alt="TikTok"
                  className="w-5 h-5 object-contain opacity-60 group-hover:opacity-100 transition-opacity"
                />
              </a>
              <a
                href="https://www.facebook.com/profile.php?id=61585849044376"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="w-9 h-9 rounded-lg glass flex items-center justify-center border border-white/10 hover:border-primary/40 hover:shadow-glow-sm transition-all duration-200 hover:scale-110 group"
              >
                <img
                  src="/images/social/facebook.svg"
                  alt="Facebook"
                  className="w-5 h-5 object-contain opacity-60 group-hover:opacity-100 transition-opacity"
                />
              </a>
              <a
                href="https://www.instagram.com/ofiapp.pe/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-9 h-9 rounded-lg glass flex items-center justify-center border border-white/10 hover:border-primary/40 hover:shadow-glow-sm transition-all duration-200 hover:scale-110 group"
              >
                <img
                  src="/images/social/instagram.svg"
                  alt="Instagram"
                  className="w-5 h-5 object-contain opacity-60 group-hover:opacity-100 transition-opacity"
                />
              </a>
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
            © {year} Servi. Todos los derechos reservados.
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