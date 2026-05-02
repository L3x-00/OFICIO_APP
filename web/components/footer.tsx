'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, Heart } from 'lucide-react';
import LegalModal from '@/components/legal-modal';

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
  { label: 'Beneficios',          href: '/#beneficios' },
  { label: 'Cómo funciona',       href: '/#como-funciona' },
  { label: 'Testimonios',         href: '/#testimonios' },
  { label: 'Panel de proveedor',  href: '/login' },
];

export default function Footer() {
  const year = new Date().getFullYear();
  const [legalModal, setLegalModal] = useState<{ open: boolean; title: string; content: string }>({
    open: false,
    title: '',
    content: '',
  });

  return (
    <footer className="relative border-t border-white/5 bg-bg-card/30 overflow-hidden">
      <div
        className="absolute inset-0 bg-grid-pattern bg-grid-md opacity-[0.03] pointer-events-none"
        aria-hidden
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-10">

          {/* Marca */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="flex items-center gap-3 mb-4 group w-fit">
              <div className="relative w-10 h-10 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                <Image
                  src="/images/logo/logo_dark.png"
                  alt="OficioApp"
                  fill
                  className="object-contain"
                  sizes="40px"
                />
              </div>
              <span className="text-text-primary font-bold text-xl group-hover:text-primary transition-colors">
                OficioApp
              </span>
            </Link>
            <p className="text-text-muted text-base leading-relaxed mb-4 max-w-xs">
              Encuentra al profesional ideal en minutos, no en horas.
              El marketplace peruano que garantiza seguridad y calidad en oficios y negocios locales a través de verificación rigurosa.
            </p>
            <span className="text-text-primary font-bold text-sm group-hover:text-primary transition-colors">
                Visita nuestras redes sociales
            </span>
            {/* Redes sociales */}
            <div className="flex items-center gap-4 mt-4">
              {/* Gmail */}
              <a
                href="https://mail.google.com/mail/?view=cm&fs=1&to=soporteofiapp@gmail.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Gmail"
                className="transition-opacity hover:opacity-80"
              >
                <img
                  src="/images/social/gmail.png"
                  alt="Gmail"
                  className="w-7 h-7 object-contain rounded-full"
                />
              </a>

              {/* TikTok */}
              <a
                href="https://tiktok.com/@kirasaludintegral"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                className="transition-opacity hover:opacity-80"
              >
                <img
                  src="/images/social/tik-tok.png"
                  alt="TikTok"
                  className="w-7 h-7 object-contain rounded-full"
                />
              </a>

              {/* Facebook */}
              <a
                href="https://www.facebook.com/profile.php?id=61585849044376"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="transition-opacity hover:opacity-80"
              >
                <img
                  src="/images/social/fb.png"
                  alt="Facebook"
                  className="w-7 h-7 object-contain rounded-full"
                />
              </a>

              {/* Instagram */}
              <a
                href="https://instagram.com/kirasaludintegral"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="transition-opacity hover:opacity-80"
              >
                <img
                  src="/images/social/instagram.png"
                  alt="Instagram"
                  className="w-7 h-7 object-contain rounded-full"
                />
              </a>
            </div>
          </div>

          {/* Secciones */}
          <div>
            <h4 className="text-text-primary font-semibold text-xs mb-4 uppercase tracking-wider">
              Explorar
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

          {/* Contacto */}
          <div>
            <h4 className="text-text-primary font-semibold text-xs mb-4 uppercase tracking-wider">
              Contacto
            </h4>
            <ul className="space-y-2.5">
              <li>
                <a
                  href="https://mail.google.com/mail/?view=cm&fs=1&to=soporteofiapp@gmail.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-muted text-sm hover:text-primary transition-colors"
                >
                  Soporte técnico
                </a>
              </li>
              <li>
                <a
                  href="https://mail.google.com/mail/?view=cm&fs=1&to=ronla.angarita31@gmail.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-muted text-sm hover:text-primary transition-colors"
                >
                  Ventas y planes
                </a>
              </li>
              <li>
                <a
                  href="https://mail.google.com/mail/?view=cm&fs=1&to=dannyafk2000@gmail.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-muted text-sm hover:text-primary transition-colors"
                >
                  Centro de ayuda
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-text-primary font-semibold text-xs mb-4 uppercase tracking-wider">
              Legal
            </h4>
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
                  className="text-text-muted text-sm hover:text-primary transition-colors text-left"
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
                  className="text-text-muted text-sm hover:text-primary transition-colors text-left"
                >
                  Política de privacidad
                </button>
              </li>
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

      {/* Modal legal */}
      <LegalModal
        isOpen={legalModal.open}
        onClose={() => setLegalModal({ open: false, title: '', content: '' })}
        title={legalModal.title}
        content={legalModal.content}
      />
    </footer>
  );
}