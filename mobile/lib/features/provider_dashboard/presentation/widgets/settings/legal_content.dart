/// Textos legales y de ayuda mostrados en `LegalSheet`.
///
/// Cada par OFICIO/NEGOCIO existe porque las obligaciones, beneficios y
/// flujos son distintos para profesionales independientes vs. negocios.
library;

const kPrivacyOficio = '''
POLÍTICA DE PRIVACIDAD — Profesionales (OFICIO)
Servi · Versión 1.0 . 2026

1. Identidad del Responsable: Servi (en adelante "La Plataforma"), con domicilio en [Tu Ciudad], Perú, es el responsable del tratamiento de sus datos personales.
2. Datos Recolectados y Finalidad: * Datos Identificativos: Nombre completo, DNI (foto ambas caras), y selfie de validación. Finalidad: Verificar la identidad y otorgar la insignia "Confiable".
Datos de Contacto: Número de celular. Finalidad: Permitir que los clientes se contacten con usted fuera de la App.
Datos de Ubicación: Departamento y Distrito. Finalidad: Mostrar su zona de influencia a los clientes.
Marketing de Terceros: Sus datos de contacto (no sensibles) podrán ser transferidos a empresas aliadas para fines publicitarios, siempre que usted lo autorice expresamente.
3. Transferencia de Datos: * Supabase: Se utiliza para la gestión técnica de correos electrónicos y autenticación.
Autoridades: Los datos se entregarán ante mandato judicial. En caso de reporte de fraude, se colaborará con la víctima facilitando datos de identificación para la denuncia legal respectiva.
4. Almacenamiento y Seguridad: Sus fotos de DNI y selfies se almacenan de forma segura en nuestros servidores hasta que usted decida eliminar su cuenta. El acceso está restringido exclusivamente al administrador de la plataforma.
5. Derechos ARCO: Usted puede ejercer sus derechos de Acceso, Rectificación, Cancelación y Oposición escribiendo a nuestro soporte técnico en la App.

Esta política describe cómo Servi recopila, usa y protege
la información de los profesionales registrados en la plataforma.

Datos recopilados: nombre, DNI, teléfono, ubicación, foto de perfil,
historial de reseñas y métricas de actividad.

Última actualización: 2026
''';

const kPrivacyNegocio = '''
POLÍTICA DE PRIVACIDAD — Negocios (NEGOCIO)
Servi · Versión 1.0 · 2026

1. Naturaleza de los Datos: Tratándose de negocios (Personas Jurídicas o Personas Naturales con Negocio - RUC 10), se recopilan datos para fortalecer la transparencia comercial.
2. Información Pública por Defecto: Para generar confianza en el mercado, los siguientes datos serán PÚBLICOS:
Nombre Comercial y Razón Social.
Número de RUC.
Ubicación (Distrito/Departamento).
Información sobre Delivery (si aplica).
3. Geolocalización (GPS): En el perfil de Negocio, la aplicación podrá utilizar la ubicación en tiempo real para:
Validar la veracidad de las reseñas de los clientes (verificar que el cliente estuvo en el establecimiento).
Mostrar el negocio en el mapa de proveedores locales.
No se guardará un historial de rutas del administrador del negocio.
4. Verificación de Confianza: Para obtener el badge de "Confiable", el negocio debe presentar documentación de SUNAT. Estos documentos no serán públicos y se tratarán bajo los mismos estándares de seguridad que los datos de los profesionales.
5. Uso Comercial: Al registrarse como Negocio, acepta que la información pública de su establecimiento pueda ser utilizada en campañas de marketing de Servi o transferida a socios comerciales para potenciar el ecosistema de servicios locales.

Esta política describe cómo Servi recopila, usa y protege
la información de los negocios registrados en la plataforma.

Datos recopilados: razón social, RUC, nombre comercial, dirección,
horario, fotos del local, historial de reseñas y métricas de ventas.

Última actualización: 2026
''';

const kTermsOficio = '''
TÉRMINOS Y CONDICIONES — Profesionales (OFICIO)
Servi · Versión 1.0 · 2026

[PEGAR TEXTO AQUÍ — Términos para profesionales/oficios]

Al registrarte como profesional en Servi aceptas prestar
servicios de manera responsable, mantener tu perfil actualizado
y respetar las calificaciones y reseñas de los clientes.

Última actualización: 2026
''';

const kTermsNegocio = '''
TÉRMINOS Y CONDICIONES — Negocios (NEGOCIO)
Servi · Versión 1.0 · 2026

[PEGAR TEXTO AQUÍ — Términos para negocios]

Al registrar tu negocio en Servi aceptas publicar información
veraz sobre tus productos y servicios, respetar los horarios
declarados y cumplir con la normativa comercial vigente.

Última actualización: 2026
''';

const kHelpOficio = '''
CENTRO DE AYUDA — Profesionales
Servi · 2026

1.1. ¿Cómo obtengo la insignia "Confiable"?
Para obtenerla, debes completar el formulario de Validación de Datos en tu panel. Requerimos una foto nítida de tu DNI (ambas caras) y una selfie sosteniendo tu documento para evitar suplantaciones. Una vez enviada, el administrador verificará que los datos coincidan con los registros públicos en un plazo de 24 a 48 horas.
1.2. ¿Por qué rechazaron mi documento de identidad?
Las razones más comunes son:
La foto está borrosa o tiene reflejos que impiden leer el DNI.
El documento está vencido.
La selfie no coincide con la foto del DNI.
Los nombres registrados en la App no coinciden exactamente con el documento físico.
1.3. ¿Cómo recibo los pagos de mis clientes?
Servi no interviene en los pagos por tus servicios. Tú acuerdas el precio y el método de pago (efectivo, Yape, transferencia) directamente con el cliente a través de WhatsApp o llamada telefónica. Recomendamos siempre pedir un adelanto solo si el trabajo lo justifica y dar un comprobante si eres formal.
3.1. Un cliente me estafó o me trató mal, ¿qué hago?
Puedes reportar al usuario desde la opción de soporte en la App. Si el incidente es grave (robo o agresión), te proporcionaremos la información de registro del usuario (dentro de los límites legales) para que realices la denuncia ante la PNP o el Ministerio Público.
3.2. ¿Cómo funciona el sistema de reseñas?
Las reseñas son de los usuarios y Servi no las borra a menos que contengan insultos o sean falsas demostrables. Si consideras que una reseña es injusta, puedes solicitar una Mediación de Perfil para ocultarla temporalmente mientras se aclara el incidente con el cliente.
3.3. ¿Mis datos están seguros?
Sí. Tus fotos de documentos (DNI/RUC) no son visibles para ningún usuario; solo las ve el administrador para fines de validación. Usamos almacenamiento encriptado para proteger tu información sensible.
PREGUNTAS FRECUENTES

¿Cómo mejoro mi visibilidad?
Completa al 100% tu perfil, agrega fotos y responde rápido a los clientes.

¿Cómo activo el servicio a domicilio?
Ve a Configuración → Servicio a domicilio y activa el toggle.

¿Cómo subo de plan?
Ve a Configuración → Subir de rango y elige el plan que más te convenga.

¿Cómo contacto soporte?
Escribe a soporteofiapp@gmail.com o usa "Reportar un problema".
''';

const kHelpNegocio = '''
CENTRO DE AYUDA — Negocios
Servi · 2026

2.1. ¿Qué ventajas tengo al registrar mi RUC?
Registrar tu RUC permite que los clientes verifiquen que eres un negocio formal ante la SUNAT, lo cual aumenta drásticamente tu tasa de clics y llamadas. Además, habilita campos específicos como Nombre Comercial y Razón Social en tu tarjeta de presentación.
2.2. ¿Cómo funciona el sistema de Delivery?
En tu panel de configuración, puedes activar el toggle de "Tiene Delivery". Si marcas la opción "Plena Coordinación", el cliente entenderá que el costo y la zona de envío se negocian directamente contigo al momento del contacto.
2.3. ¿Puedo tener un perfil de Oficio y uno de Negocio a la vez?
Sí, pero bajo las siguientes condiciones:
Debes usar el mismo correo, pero gestionarás perfiles separados en tu dashboard.
Cada perfil requiere su propia validación de datos para garantizar la transparencia ante el usuario final.

PREGUNTAS FRECUENTES

¿Cómo actualizo mi horario de atención?
Ve a tu perfil de negocio → Editar → Horario.

¿Cómo activo la opción de delivery?
Ve a Configuración → Servicio a domicilio y activa el toggle.

¿Cómo subo de plan?
Ve a Configuración → Subir de rango y elige el plan que más te convenga.

¿Cómo contacto soporte?
Escribe a soporteofiapp@gmail.com o usa "Reportar un problema".
''';
