import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de Privacidad | Servi',
  description: 'Política de Privacidad de Servi - Marketplace de servicios locales en Perú',
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="max-w-4xl mx-auto px-5 sm:px-8 lg:px-10 py-20 sm:py-28">

        <div className="mb-14">
          <span className="eyebrow">Legal</span>
          <h1 className="mt-3 font-display font-bold tracking-tightest text-ink text-[36px] sm:text-[44px] leading-[1.1]">
            Política de Privacidad
          </h1>
          <p className="text-ink-4 mt-3 text-[14px]">
            Última actualización: Mayo 2026 · Versión 1.0
          </p>
        </div>

        <div className="space-y-10 text-ink-2 leading-relaxed text-[15px]">

          <Section title="Ámbito de aplicación">
            <p>Territorio de la República del Perú, con enfoque en ciudades intermedias.</p>
          </Section>

          <Section title="1. Identidad del Responsable">
            <p>
              <strong className="text-ink">Servi</strong> (en adelante, &ldquo;La Plataforma&rdquo; o &ldquo;Nosotros&rdquo;),
              operada y desarrollada de manera independiente, con domicilio en Huancayo, Perú, es el responsable
              del tratamiento, almacenamiento y protección de sus datos personales, conforme a lo establecido en la
              Ley N° 29733, Ley de Protección de Datos Personales, y su Reglamento.
            </p>
          </Section>

          <Section title="2. Información que Recopilamos">
            <p>
              La Plataforma cuenta con distintos tipos de perfiles (Usuario, Profesional de Oficio y Negocio).
              La recopilación de datos varía según el tipo de cuenta:
            </p>

            <SubSection title="A. Para Clientes (Usuarios)">
              <ul className="list-disc pl-5 space-y-1 marker:text-ink-4">
                <li><strong className="text-ink">Datos de Identificación y Contacto:</strong> Nombres, apellidos y número de teléfono celular.</li>
                <li><strong className="text-ink">Datos de Ubicación (GPS):</strong> Ubicación en tiempo real solicitada explícitamente para publicar necesidades en el sistema de subastas y calcular distancias con los proveedores.</li>
                <li><strong className="text-ink">Datos de Uso:</strong> Historial de solicitudes de servicio, reseñas publicadas e interacciones dentro de la app.</li>
              </ul>
            </SubSection>

            <SubSection title="B. Para Profesionales (Oficios)">
              <ul className="list-disc pl-5 space-y-1 marker:text-ink-4">
                <li><strong className="text-ink">Datos Públicos de Perfil:</strong> Nombre, número de contacto, redes sociales (opcional), zona de influencia y foto de perfil.</li>
                <li><strong className="text-ink">Datos de Validación de Confianza (Sensibles):</strong> Fotografías del Documento Nacional de Identidad (DNI) por ambas caras y fotografía facial (selfie) tomadas directamente desde la cámara de la aplicación.</li>
                <li><strong className="text-ink">Datos de Ubicación:</strong> Coordenadas GPS para la asignación de subastas locales, validación de llegada al servicio y cálculo de distancias (Haversine).</li>
              </ul>
            </SubSection>

            <SubSection title="C. Para Negocios (Personas Jurídicas o con RUC 10)">
              <ul className="list-disc pl-5 space-y-1 marker:text-ink-4">
                <li><strong className="text-ink">Datos Comerciales Públicos:</strong> Razón social, nombre comercial, número de RUC, si cuenta con servicio de delivery, ubicación (distrito/departamento) y fotografías del local.</li>
                <li><strong className="text-ink">Datos de Validación:</strong> Documentación de SUNAT requerida para la verificación de confianza.</li>
              </ul>
            </SubSection>
          </Section>

          <Section title="3. Finalidad del Tratamiento de Datos">
            <p>Los datos recopilados se utilizarán exclusivamente para los siguientes fines:</p>
            <ul className="list-disc pl-5 space-y-2 mt-3 marker:text-ink-4">
              <li><strong className="text-ink">Operación del Servicio:</strong> Conectar el talento local con clientes a través del sistema de subastas en tiempo real.</li>
              <li><strong className="text-ink">Seguridad y Confianza:</strong> El módulo de validación revisa los documentos (DNI/RUC) para otorgar la insignia &ldquo;Confiable&rdquo;. Los documentos de identidad y selfies no son públicos y se utilizan únicamente para la verificación interna de la identidad del proveedor para prevenir fraudes.</li>
              <li><strong className="text-ink">Validación de Reseñas:</strong> Se utiliza el GPS para verificar que el cliente estuvo en el área del servicio o establecimiento al momento de dejar una reseña.</li>
              <li><strong className="text-ink">Fines Comerciales y de Marketing:</strong> La Plataforma podrá anonimizar, agrupar o transferir datos de contacto y perfiles comerciales (estrictamente no sensibles) a empresas terceras o aliados estratégicos para fines publicitarios, análisis de mercado y prospección comercial. Todo usuario deberá otorgar su consentimiento expreso (Opt-in) para este fin durante el registro.</li>
            </ul>
          </Section>

          <Section title="4. Almacenamiento y Seguridad">
            <p>
              La información es tratada con altos estándares de seguridad. Los datos de texto y geolocalización
              se procesan en bases de datos relacionales seguras. Las imágenes sensibles, como fotos de perfil,
              galerías de trabajo, fotografías de DNI, selfies de validación y sustentos de SUNAT, se almacenan
              de manera cifrada en servicios de almacenamiento en la nube (Cloudflare R2 / MinIO).
            </p>
            <p className="mt-3">
              El acceso a los documentos de identidad está restringido tecnológica y administrativamente; solo
              el personal autorizado de moderación tiene acceso para aprobar o rechazar solicitudes de verificación.
            </p>
          </Section>

          <Section title="5. Transferencia y Compartición de Datos">
            <p>
              Sus datos personales no serán vendidos ni transferidos a terceros sin su consentimiento, con las
              siguientes excepciones:
            </p>
            <ul className="list-disc pl-5 space-y-2 mt-3 marker:text-ink-4">
              <li><strong className="text-ink">Aliados Comerciales:</strong> Previa autorización expresa del usuario en la pantalla de &ldquo;Términos y Condiciones&rdquo;, datos no sensibles podrán ser compartidos para los fines descritos en la Sección 3.</li>
              <li><strong className="text-ink">Autoridades Legales:</strong> Se proporcionará información sin necesidad de consentimiento ante una orden judicial o solicitud formal del Ministerio Público o Policía Nacional del Perú, especialmente en casos de reportes de usuarios sobre proveedores que involucren fraudes o actos ilícitos.</li>
            </ul>
          </Section>

          <Section title="6. Retención de Datos y Eliminación de Cuenta">
            <p>Los datos se conservarán mientras la cuenta del usuario permanezca activa.</p>
            <p className="mt-3">
              Los usuarios pueden solicitar la eliminación total de su cuenta y sus datos asociados en cualquier
              momento desde la sección de ajustes de la aplicación, escribiendo la palabra de confirmación
              &ldquo;<strong className="text-ink">ELIMINAR</strong>&rdquo;. Al realizar esta acción, el sistema ejecutará una eliminación
              en cascada de sus datos personales, a excepción de aquellos que deban conservarse temporalmente por
              obligaciones legales o fiscales.
            </p>
          </Section>

          <Section title="7. Derechos ARCO">
            <p>
              Usted tiene derecho a ejercer sus derechos de Acceso, Rectificación, Cancelación y Oposición (ARCO)
              sobre sus datos personales. Para ejercerlos, puede enviar una solicitud a través del Centro de Ayuda
              dentro de la aplicación o contactando al soporte oficial de Servi.
            </p>
          </Section>

          <Section title="Contacto">
            <p>Para cualquier consulta sobre esta Política de Privacidad, puede contactarnos a través de:</p>
            <ul className="list-disc pl-5 space-y-1 mt-3 marker:text-ink-4">
              <li>Email: <a href="mailto:soporteofiapp@gmail.com" className="text-ink underline underline-offset-4 hover:text-ink-2">soporteofiapp@gmail.com</a></li>
              <li>Web: <a href="https://www.oficioapp.org.pe" className="text-ink underline underline-offset-4 hover:text-ink-2">www.oficioapp.org.pe</a></li>
            </ul>
          </Section>
        </div>

        <div className="mt-16 pt-8 border-t border-line text-center text-ink-4 text-[13px]">
          <p>© 2026 Servi. Todos los derechos reservados.</p>
          <p className="mt-1 inline-flex items-center gap-2">
            <span className="peru-stripe">
              <i /><i /><i />
            </span>
            Hecho con cariño en Perú
          </p>
        </div>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display font-semibold text-ink text-[20px] sm:text-[22px] mb-4 tracking-tightest">
        {title}
      </h2>
      {children}
    </section>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5 pl-4 border-l border-line-2">
      <h3 className="font-display font-semibold text-ink text-[16px] mb-2">{title}</h3>
      {children}
    </div>
  );
}
