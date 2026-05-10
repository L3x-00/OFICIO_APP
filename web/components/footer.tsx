'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart } from 'lucide-react';
import LegalModal from '@/components/legal-modal';
import AboutModal from '@/components/about-modal';

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
  { label: 'Beneficios',         href: '/#beneficios' },
  { label: 'Cómo funciona',      href: '/#como-funciona' },
  { label: 'Testimonios',        href: '/#testimonios' },
  { label: 'Manual de usuario',  href: '/#guia' },
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

  return (
    <footer className="relative border-t border-line bg-paper-warm">
      <div className="relative max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">

          {/* Marca */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="flex items-center gap-3 mb-5 group w-fit">
              <div className="relative w-10 h-10 rounded-xl bg-ink flex items-center justify-center shadow-ink-soft transition-transform duration-300 group-hover:scale-[1.04]">
                <Image
                  src="/images/logo/logo_dark.png"
                  alt="OficioApp"
                  width={24}
                  height={24}
                  className="object-contain"
                />
              </div>
              <span className="font-display font-bold text-ink text-[18px] tracking-tightest">
                OficioApp
              </span>
            </Link>
            <p className="text-ink-3 text-[14.5px] leading-relaxed mb-5 max-w-xs">
              Encuentra al profesional ideal en minutos, no en horas.
              El marketplace peruano que garantiza seguridad y calidad en oficios y negocios locales.
            </p>

            <span className="eyebrow block mb-3">Síguenos</span>
            <div className="flex items-center gap-3">
              <a href="https://mail.google.com/mail/?view=cm&fs=1&to=soporteofiapp@gmail.com" target="_blank" rel="noopener noreferrer" aria-label="Gmail" className="w-9 h-9 rounded-lg bg-surface border border-line-2 hover:border-ink-4 transition-colors flex items-center justify-center">
                <img src="/images/social/gmail.png" alt="" className="w-5 h-5 object-contain" />
              </a>
              <a href="https://www.tiktok.com/@ofiapp.pe" target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="w-9 h-9 rounded-lg bg-surface border border-line-2 hover:border-ink-4 transition-colors flex items-center justify-center">
                <img src="/images/social/tik-tok.png" alt="" className="w-5 h-5 object-contain" />
              </a>
              <a href="https://www.facebook.com/profile.php?id=61585849044376" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="w-9 h-9 rounded-lg bg-surface border border-line-2 hover:border-ink-4 transition-colors flex items-center justify-center">
                <img src="/images/social/fb.png" alt="" className="w-5 h-5 object-contain" />
              </a>
              <a href="https://www.instagram.com/ofiapp.pe/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="w-9 h-9 rounded-lg bg-surface border border-line-2 hover:border-ink-4 transition-colors flex items-center justify-center">
                <img src="/images/social/instagram.png" alt="" className="w-5 h-5 object-contain" />
              </a>
            </div>
          </div>

          {/* Explorar */}
          <div>
            <h4 className="eyebrow mb-4">Explorar</h4>
            <ul className="space-y-3">
              {productLinks.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-ink-2 text-[14px] hover:text-ink transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
              <li>
                <button
                  onClick={() => setAboutOpen(true)}
                  className="text-ink-2 text-[14px] hover:text-ink transition-colors text-left"
                >
                  Conócenos
                </button>
              </li>
            </ul>
          </div>

          {/* Contacto */}
          <div>
            <h4 className="eyebrow mb-4">Contacto</h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="https://mail.google.com/mail/?view=cm&fs=1&to=soporteofiapp@gmail.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ink-2 text-[14px] hover:text-ink transition-colors"
                >
                  Soporte técnico
                </a>
              </li>
              <li>
                <a
                  href="https://mail.google.com/mail/?view=cm&fs=1&to=ronla.angarita31@gmail.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ink-2 text-[14px] hover:text-ink transition-colors"
                >
                  Ventas y planes
                </a>
              </li>
              <li>
                <a
                  href="https://mail.google.com/mail/?view=cm&fs=1&to=dannyafk2000@gmail.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ink-2 text-[14px] hover:text-ink transition-colors"
                >
                  Centro de ayuda
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="eyebrow mb-4">Legal</h4>
            <ul className="space-y-3">
              <li>
                <button
                  onClick={() =>
                    setLegalModal({
                      open: true,
                      title: 'Términos y Condiciones',
                      content: TERMS_CONTENT,
                    })
                  }
                  className="text-ink-2 text-[14px] hover:text-ink transition-colors text-left"
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
                  className="text-ink-2 text-[14px] hover:text-ink transition-colors text-left"
                >
                  Política de privacidad
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Barra inferior */}
        <div className="pt-7 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-ink-4 text-[12.5px]">
            © {year} OficioApp. Todos los derechos reservados.
          </span>
          <span className="text-ink-4 text-[12.5px] inline-flex items-center gap-2">
            <span className="peru-stripe">
              <i /><i /><i />
            </span>
            Hecho con <Heart size={11} className="text-rose fill-rose" /> en Perú
          </span>
        </div>
      </div>

      <LegalModal
        isOpen={legalModal.open}
        onClose={() => setLegalModal({ open: false, title: '', content: '' })}
        title={legalModal.title}
        content={legalModal.content}
      />
      <AboutModal isOpen={aboutOpen} onClose={() => setAboutOpen(false)} />
    </footer>
  );
}
