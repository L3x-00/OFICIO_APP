/// Textos legales y de ayuda mostrados en `LegalSheet`.
///
/// Cada par OFICIO/NEGOCIO existe porque las obligaciones, beneficios y
/// flujos son distintos para profesionales independientes vs. negocios.
library;

const kPrivacyOficio = '''
POLÍTICA DE PRIVACIDAD — Profesionales Independientes (OFICIO)
Servi · Versión 2.0 · Junio 2026

1. IDENTIDAD DEL RESPONSABLE DEL TRATAMIENTO
Servi (en adelante "La Plataforma"), con domicilio operativo en la ciudad de Huancayo, departamento de Junín, Perú, actúa como responsable del tratamiento de los datos personales de los profesionales registrados, en estricto cumplimiento de la Ley N° 29733, Ley de Protección de Datos Personales, y su Reglamento aprobado por Decreto Supremo N° 003-2013-JUS.

2. DATOS RECOLECTADOS Y FINALIDAD
El tratamiento de datos se rige por los principios de finalidad, proporcionalidad y calidad. Para la operatividad del perfil "Oficio", se recolecta:
• Datos Identificativos Sensibles: Nombre completo, fotografía del DNI (ambas caras) y selfie de validación biométrica. Finalidad: Verificar la identidad real, prevenir la suplantación y habilitar la insignia "Confiable". Su tratamiento requiere su consentimiento expreso e inequívoco.
• Datos de Contacto: Número de celular. Finalidad: Habilitar los canales de comunicación directa (WhatsApp / llamadas) fuera del ecosistema de la App. El Usuario asume libremente el riesgo de exponer estos datos al público.
• Datos de Ubicación: Departamento, provincia y distrito; así como geolocalización en tiempo real (GPS) de forma puntual. Finalidad: Calcular distancias en el sistema de subastas (Haversine), validar la autenticidad de reseñas (radio ≤500m) y registrar la función "Ya llegué". La Plataforma no rastrea ni almacena historiales de rutas continuas.
• Datos de Interacción y Monedas: Historial de reseñas, métricas de clics, saldo de "Monedas" (valor promocional virtual no canjeable por dinero real) y participaciones en subastas.
• Interacciones con Asistente IA ("Ofi"): Los textos ingresados en el chat de asistencia IA son procesados para generar respuestas sugeridas, aplicándose filtros automáticos de redacción de datos sensibles (PII) en la salida.

3. EXPOSICIÓN PÚBLICA, TOGGLES DE PRIVACIDAD Y DESLINDE DE RESPONSABILIDAD
3.1. Naturaleza Pública: Al registrarse como Oficio, el Usuario acepta que su nombre, oficio, zona de influencia y datos de contacto serán visibles públicamente para viabilizar su contratación.
3.2. Control del Usuario: La Plataforma provee herramientas de configuración (toggles) que permiten al Profesional ocultar su número de celular, enlace de WhatsApp o ubicación exacta en el mapa. El Usuario es el único responsable de configurar sus preferencias de privacidad.
3.3. Deslinde de Responsabilidad por Delitos de Terceros: Dado que la finalidad de la App es conectar usuarios, la información de contacto se expone bajo la entera voluntad del Profesional. En consecuencia, Servi no se hace responsable por los delitos (extorsión, acoso, fraude, robo) que terceros puedan cometer utilizando dicha información pública. El Profesional asume el riesgo residual de visibilidad comercial, mitigable mediante el uso de los controles de privacidad mencionados.

4. TRANSFERENCIA Y ENCARGADOS DE TRATAMIENTO
Para la prestación del servicio tecnológico, los datos son transferidos exclusivamente a encargados bajo estándares de seguridad:
• Supabase (PostgreSQL): Gestión de base de datos relacional y autenticación.
• Cloudflare R2: Almacenamiento encriptado de documentos e imágenes (DNI, selfies, galería).
• Upstash (Redis): Caché temporal de sesiones y control de cuotas.
• Firebase Auth & FCM: Autenticación social y notificaciones push.
• Brevo: Envío de correos transaccionales (OTP).
• Autoridades Competentes: Los datos serán puestos a disposición ante requerimiento judicial o de la autoridad fiscalizadora competente. En casos de fraude o ilícitos reportados, se colaborará con la víctima facilitando los datos de identificación del presunto infractor para las denuncias legales correspondientes.

5. ALMACENAMIENTO, SEGURIDAD Y RETENCIÓN
• Documentos Sensibles: Las fotografías de DNI y selfies se almacenan de forma encriptada en reposo (Cloudflare R2). Su acceso está restringido exclusivamente al personal administrativo autorizado de La Plataforma para fines de validación. No son accesibles por otros usuarios.
• Mensajería (Chat): Por políticas de seguridad y privacidad informática, los mensajes intercambiados en el chat de la aplicación son eliminados de forma automática e irreversible transcurridos tres (3) días calendario desde su envío. La Plataforma no actúa como custodio de pruebas legales.
• Retención: Los datos se conservarán mientras exista la relación contractual o hasta que el Usuario ejerza su derecho de supresión, salvo retención obligatoria por mandato legal.

6. DERECHOS ARCO (Ley N° 29733)
El Profesional puede ejercer en cualquier momento sus derechos de Acceso, Rectificación, Cancelación y Oposición respecto al tratamiento de sus datos personales, enviando una comunicación al canal oficial de soporte: soporteofiapp@gmail.com.

Última actualización: Junio 2026
''';

const kPrivacyNegocio = '''
POLÍTICA DE PRIVACIDAD — Negocios y Establecimientos (NEGOCIO)
Servi · Versión 2.0 · Junio 2026

1. IDENTIDAD DEL RESPONSABLE DEL TRATAMIENTO
Servi (en adelante "La Plataforma"), con domicilio operativo en la ciudad de Huancayo, departamento de Junín, Perú, actúa como responsable del tratamiento de los datos personales del representante legal y del establecimiento registrado, en estricto cumplimiento de la Ley N° 29733, Ley de Protección de Datos Personales, y su Reglamento aprobado por Decreto Supremo N° 003-2013-JUS.

2. NATURALEZA DUAL DE LOS DATOS Y PRINCIPIO DE PUBLICIDAD COMERCIAL
Tratándose de Personas Jurídicas o Personas Naturales con Negocio (RUC 10), la información tratada posee una doble naturaleza: los datos del representante legal son personales, mientras que la información del establecimiento es de dominio público por imperativo del mercado y la transparencia comercial.
2.1. Información Pública por Defecto: Para garantizar la confianza del consumidor y viabilizar la finalidad de la plataforma, los siguientes datos serán de acceso público irrestricto:
• Nombre Comercial y Razón Social.
• Número de RUC (información de acceso público conforme a SUNAT).
• Ubicación física (Dirección, Distrito, Departamento).
• Estado de Delivery y Coordinación.
• Horarios de atención y catálogo de servicios/productos.
2.2. Control del Usuario (Toggles de Privacidad): La Plataforma provee herramientas de configuración que permiten al Negocio ocultar su número de teléfono, enlace de WhatsApp o pin de ubicación exacta en el mapa. El Negocio asume la responsabilidad de configurar estas opciones según su apetito de riesgo.
2.3. Exención Absoluta de Responsabilidad por Delitos de Terceros: El Negocio declara saber que la exposición de su dirección física y datos de contacto es inherente a su actividad comercial. En consecuencia, Servi queda expresamente liberado de cualquier responsabilidad civil, penal o administrativa derivada de delitos (extorsión, acoso, robo, fraude, vandalismo) cometidos por terceros que utilicen la información pública de la App con fines ilícitos. El Negocio asume el riesgo residual de visibilidad comercial, teniendo a su disposición los controles de privacidad para mitigarlo.

3. DATOS SENSIBLES, FINANCIEROS Y DE VERIFICACIÓN
Para la operatividad del perfil "Negocio" y el sistema de confianza, se recolecta:
• Datos Identificativos del Representante: DNI y selfie de validación. Finalidad: Prevenir la suplantación de identidad corporativa.
• Documentación SUNAT: Para la obtención del badge "Confiable". Estos documentos son tratados con el más alto nivel de seguridad y no son expuestos al público bajo ninguna circunstancia.
• Comprobantes de Pago (Yape): Las imágenes de los comprobantes de pago por suscripciones se almacenan encriptadas en reposo (Cloudflare R2) y su acceso está restringido exclusivamente al personal administrativo de La Plataforma para validación visual. Servi actúa como mero receptor técnico de la imagen; no garantiza la autenticidad del comprobante frente a la entidad financiera emisora ni asume responsabilidad por pagos simulados o falsificados por el proveedor.
• Geolocalización (GPS): Utilizada puntualmente para validar la autenticidad de las reseñas (verificar que el cliente estuvo en el establecimiento en un radio ≤500m) y para la función "Ya llegué" en subastas. No se rastrea ni almacena el historial de rutas del administrador.

4. INTERACCIONES, IA Y RETENCIÓN DE DATOS
• Asistente IA ("Ofi"): Las interacciones con la IA se procesan para generar respuestas sugestivas, aplicando filtros de redacción de datos sensibles (PII). Las respuestas no constituyen asesoría comercial vinculante.
• Monedas Virtuales: El saldo en "Monedas" constituye un valor promocional virtual, intangible y carente de valor fiduciario, no canjeable por dinero real.
• Mensajería (Chat): Por políticas de seguridad, los mensajes en el chat son eliminados de forma automática e irreversible a los tres (3) días calendario de su envío. Servi no actúa como custodio de pruebas ni historiales legales.

5. TRANSFERENCIA Y ENCARGADOS DE TRATAMIENTO
Los datos interactúan exclusivamente con los siguientes encargados para la prestación del servicio tecnológico:
• Supabase (PostgreSQL): Gestión de base de datos y autenticación.
• Cloudflare R2: Almacenamiento encriptado de documentos y comprobantes.
• Upstash (Redis): Caché de sesiones y cuotas.
• Firebase Auth & FCM: Autenticación social y notificaciones push.
• Brevo: Correos transaccionales (OTP).
• Pasarelas de Pago (MercadoPago/Culqi): Procesamiento de pagos seguros bajo sus propios términos.
• Autoridades Competentes: Se facilitarán datos ante mandato judicial o para coadyuvar en investigaciones por fraudes o ilícitos reportados por usuarios.

6. DERECHOS ARCO (Ley N° 29733)
El representante legal del Negocio puede ejercer sus derechos de Acceso, Rectificación, Cancelación y Oposición enviando una comunicación al canal oficial: soporteofiapp@gmail.com.

Última actualización: Junio 2026
''';

const kTermsOficio = '''
TÉRMINOS Y CONDICIONES — Profesionales Independientes (OFICIO)
Servi · Versión 2.0 · Junio 2026

Al marcar la casilla de aceptación durante el registro como Profesional (Oficio), usted declara haber leído, comprendido y aceptado quedar vinculado jurídicamente por el presente documento, bajo las leyes de la República del Perú, renunciando expresamente a cualquier reclamo contra Servi por las causales de exención aquí detalladas.

1. NATURALEZA DEL SERVICIO Y EXENCIÓN DE INTERMEDIACIÓN LABORAL
1.1. Directorio Tecnológico: Servi funciona exclusivamente como un directorio tecnológico y puente de contacto visual. No es una agencia de empleos, ni actúa como empleador, contratista, socio, ni representante legal del Profesional.
1.2. Autonomía Laboral: La relación entre el Profesional y el Cliente es de naturaleza civil o comercial privada. El Profesional actúa bajo su exclusiva cuenta y riesgo, asumiendo la total responsabilidad por el cumplimiento de sus obligaciones fiscales, laborales y de seguridad social ante la SUNAT y el MTPE.
1.3. No Intervención en Pagos: Servi no es pasarela de pago, custodio de fondos ni garante de las transacciones. La negociación de precios y el intercambio monetario se realizan extraplataforma (Yape, efectivo, transferencia). Servi no se hace responsable por impagos, cobros excesivos, fraudes financieros o falta de comprobantes de pago.

2. DESLINDE DE RESPONSABILIDAD Y ACEPTACIÓN DE RIESGOS
2.1. Calidad del Servicio: Servi no garantiza la idoneidad técnica, puntualidad o calidad del trabajo del Profesional. Cualquier daño material, personal o patrimonial derivado de una mala praxis será de responsabilidad exclusiva del Profesional, quien deberá indemnizar plenamente al afectado, liberando a Servi de toda responsabilidad civil o penal.
2.2. Delitos de Terceros (Extorsión/Robo): Al publicar su número de celular y ubicación para ser contactado, el Profesional asume el riesgo de que terceros con intenciones delictivas accedan a dicha información. Servi no se responsabiliza por extorsiones, robos, acosos o estafas cometidas por usuarios de la App. El Profesional cuenta con herramientas de privacidad (toggles) para ocultar datos sensibles, siendo su responsabilidad utilizarlos.
2.3. Validez de Comprobantes: Si el Profesional sube comprobantes de pago falsos o simulados (ej. capturas de Yape manipuladas) para aprobar su plan, Servi se reserva el derecho de expulsarlo inmediatamente y denegar reembolsos, sin perjuicio de las acciones legales pertinentes.

3. SISTEMA DE VERIFICACIÓN E INSIGNIA "CONFIABLE"
3.1. Limitación de la Insignia: La insignia "Confiable" constituye únicamente un indicador de que el Profesional ha presentado documentos (DNI) que coinciden con registros públicos superficiales. De manera enunciativa mas no limitativa, NO constituye una garantía absoluta de honestidad, solvencia moral, ausencia de antecedentes penales o pericia profesional. 
3.2. El Cliente que contrata basándose únicamente en este distintivo lo hace bajo su propio riesgo. Servi se reserva el derecho de revocar la insignia en cualquier momento ante indicios razonables de irregularidad.

4. SUBASTAS (CONFISERV) Y PENALIZACIONES CONTRACTUALES
El sistema de subastas opera bajo reglas de autorregulación comunitaria. Al participar, el Profesional acepta las siguientes penalizaciones, que no constituyen sanción arbitraria sino compensación por afectación al ecosistema:
4.1. Abandono o Inasistencia: No presentarse a un servicio ofertado y aceptado, o negarse a cumplirlo sin causa justificada, generará restricciones temporales en el sistema y posible rebaja en su calificación.
4.2. Regla del Cliente: Si un Cliente no elige a ningún oferente en tres (3) subastas consecutivas, será bloqueado preventivamente de la función por siete (7) días, con el fin de disuadir el uso frivoloso de la herramienta y el desgaste de los profesionales.

5. MONEDAS VIRTUALES Y SISTEMA DE REFERIDOS
5.1. Naturaleza: Las "Monedas" dentro de Servi son valores promocionales virtuales, intangibles e intransferibles. Bajo ningún concepto constituyen dinero electrónico o instrumento financiero. No son canjeables por dinero en efectivo.
5.2. Canje: Su único fin es el canje por beneficios internos (ej. planes de suscripción). Servi se reserva el derecho de modificar los tipos de cambio o descontinuar el sistema sin previo aviso.

6. ASISTENTE IA ("OFI") Y RETENCIÓN DE CHAT
6.1. IA Informativa: Las recomendaciones de la Inteligencia Artificial "Ofi" son de carácter meramente referencial y sugestivo. No constituyen asesoría legal ni endoso de Servi. El Profesional es el único responsable de aceptar o rechazar trabajos.
6.2. Borrado de Chat: Por políticas de seguridad, los mensajes intercambiados en el chat son eliminados de forma automática e irreversible a los tres (3) días. Servi no es custodio de pruebas legales y no responderá por la pérdida de información bajo esta política de purga.

7. RESEÑAS Y MODERACIÓN
7.1. Autenticidad: Las reseñas son propiedad de la comunidad. Servi no las elimina arbitrariamente, pero podrá ocultarlas de la vista pública bajo un proceso de mediación si el Profesional demuestra que factores externos ajenos a su labor afectaron el resultado, o si la reseña contiene insultos o falsedades demostrables.
7.2. Gestión de Prestigio: El acceso a servicios de mediación para la gestión de reseñas negativas podrá estar sujeto a planes de pago específicos (Premium), entendiéndose como un servicio de soporte administrativo y no como una alteración del ranking.

8. MENORES DE EDAD Y PROPIEDAD INTELECTUAL
8.1. Edad Mínima: El uso de la plataforma está permitido a mayores de catorce (14) años, quienes requieren autorización expresa de sus padres o tutores legales para registrarse, conforme al Código Civil. Los padres asumen toda responsabilidad por la actividad del menor.
8.2. Licencia de Uso: El Profesional otorga a Servi una licencia gratuita, no exclusiva y mundial para utilizar las fotos de perfil y trabajos subidos a la App con fines estrictamente de publicidad interna en la plataforma.

Última actualización: Junio 2026
''';

const kTermsNegocio = '''
TÉRMINOS Y CONDICIONES — Negocios y Establecimientos (NEGOCIO)
Servi · Versión 2.0 · Junio 2026

Al marcar la casilla de aceptación durante el registro como Negocio, el representante legal del establecimiento declara haber leído, comprendido y aceptado quedar vinculado jurídicamente por el presente documento, bajo las leyes de la República del Perú, renunciando expresamente a cualquier reclamo contra Servi por las causales de exención aquí detalladas.

1. NATURALEZA DEL SERVICIO Y EXENCIÓN DE INTERMEDIACIÓN COMERCIAL
1.1. Directorio Tecnológico: Servi funciona exclusivamente como un directorio tecnológico de centralización de información y puente de contacto visual. No es socio, franquiciador, ni participe de las utilidades o pérdidas del Negocio.
1.2. Autonomía Comercial: La relación entre el Negocio y el Cliente es de naturaleza privada. El Negocio actúa bajo su exclusiva cuenta y riesgo, asumiendo la total responsabilidad por el cumplimiento de sus obligaciones tributarias (SUNAT), laborales, municipales y de seguridad social.
1.3. No Intervención en Pagos: Servi no interviene en las transacciones económicas entre el Negocio y el Cliente. La plataforma no es pasarela de pago, custodio de fondos ni garante de cobros. Cualquier impago, fraude financiero o disputa monetaria deberá dirimirse directamente entre las partes.

2. CUMPLIMIENTO NORMATIVO Y PROTECCIÓN AL CONSUMIDOR
2.1. Legislación Vigente: Al publicar sus productos y servicios, el Negocio declara que cumple estrictamente con la normativa peruana vigente, incluyendo el Código de Protección y Defensa del Consumidor (Ley N° 29571), normativas sanitarias (DIGESA/INDECOPI), y reglamentos municipales.
2.2. Exención de Responsabilidad: Servi no garantiza, avala ni se hace responsable por el estado sanitario de los productos, la veracidad de la publicidad del establecimiento, la seguridad de las instalaciones físicas, ni por cualquier daño material, a la salud o patrimonial que el Cliente sufra al concurrir al Negocio. La responsabilidad exclusiva recae sobre el propietario del establecimiento.

3. EXPOSICIÓN PÚBLICA, DELITOS DE TERCEROS Y EXTORSIÓN
3.1. Riesgo de Visibilidad Comercial: El Negocio acepta que, para cumplir la finalidad de la plataforma, su dirección física, RUC, nombre comercial y datos de contacto serán de acceso público irrestricto.
3.2. Exención Absoluta de Responsabilidad por Delitos: El Negocio asume el riesgo residual de que terceros con intenciones delictivas (extorsión, robo, vandalismo, acoso) utilicen dicha información pública para localizar el establecimiento. Servi queda expresamente liberado de cualquier responsabilidad civil, penal o administrativa derivada de estos actos ilícitos cometidos por terceros.
3.3. Toggles de Privacidad: La Plataforma provee herramientas para ocultar datos de contacto sensibles. El uso o desuso de estas herramientas es responsabilidad exclusiva del Negocio.

4. DELIVERY, LOGÍSTICA Y COORDINACIÓN
4.1. Gestión Externa: La función de "Delivery" o "Plena Coordinación" anunciada en el perfil del Negocio constituye únicamente una declaración informativa del establecimiento hacia el cliente.
4.2. Deslinde Logístico: Servi no provee servicios de transporte, mensajería ni logística. Los tiempos de entrega, costos de envío, zonas de cobertura, accidentes de tránsito, pérdida de mercadería o incidentes durante el traslado son responsabilidad absoluta del Negocio o del tercero que este contrate para el delivery.

5. COMPROBANTES DE PAGO (YAPE) Y SUSCRIPCIONES
5.1. Validación Visual Limitada: La subida de comprobantes de pago (Yape) para la activación de planes de suscripción es una declaración unilateral del Negocio. La revisión por parte del Administrador de Servi constituye una validación visual preliminar y no una verificación bancaria ni financiera.
5.2. Falsedad de Comprobantes: Servi no se hace responsable si el Negocio simula, manipula o falsifica comprobantes de pago. De detectarse esta práctica, el Negocio será expulsado inmediatamente perdiendo el derecho a reembolso alguno, sin perjuicio de las acciones penales por estafa a las que haya lugar.

6. SISTEMA DE VERIFICACIÓN E INSIGNIA "CONFIABLE"
6.1. Limitación de la Insignia: La insignia "Confiable" indica únicamente que el Negocio presentó documentación (RUC/SUNAT) que coincide con registros públicos superficiales. De manera enunciativa mas no limitativa, NO constituye una garantía absoluta de solvencia económica, honestidad comercial, calidad de productos o cumplimiento de normativas sanitarias.
6.2. Revocación: Servi se reserva el derecho de revocar la insignia de forma inmediata si se detectan irregularidades en la operación del Negocio.

7. SUBASTAS, MONEDAS VIRTUALES, IA Y CHAT
7.1. Subastas y Penalizaciones: La participación en el sistema de subastas implica la aceptación de penalizaciones por inasistencia o abandono injustificado de servicios ofertados.
7.2. Monedas Virtuales: Las "Monedas" son valores promocionales virtuales, intangibles, intransferibles y carentes de valor fiduciario. No son dinero electrónico y no son canjeables por efectivo.
7.3. Asistente IA ("Ofi"): Las respuestas de la IA son sugerencias informativas y no constituyen asesoría comercial o legal vinculante.
7.4. Borrado de Chat: Los mensajes son eliminados de forma automática e irreversible a los tres (3) días. Servi no actúa como custodio de pruebas legales.

8. RESEÑAS, MENORES DE EDAD Y PROPIEDAD INTELECTUAL
8.1. Moderación: Servi podrá ocultar reseñas de la vista pública bajo proceso de mediación si se demuestra que factores externos afectaron la experiencia del cliente, o si la reseña viola las normas de la comunidad.
8.2. Menores de Edad: El registro y uso está permitido a mayores de 14 años con autorización de sus padres o tutores, quienes asumen la responsabilidad.
8.3. Licencia de Uso: El Negocio otorga a Servi una licencia gratuita, no exclusiva y mundial para utilizar logotipos, fotos del local y productos con fines de publicidad interna en la plataforma y marketing de ecosistema local.

Última actualización: Junio 2026
''';

const kHelpOficio = '''
CENTRO DE AYUDA — Profesionales Independientes (Oficio)
Servi · 2026

1.1. ¿Cómo obtengo la insignia "Confiable"?
Completa el formulario de Validación de Datos en tu panel. Requerimos una foto nítida de tu DNI (ambas caras) y una selfie sosteniendo tu documento para evitar suplantaciones. El administrador verificará la coincidencia en un plazo de 24 a 48 horas. 
Recuerda: Esta insignia indica que tu identidad fue validada, pero no constituye una garantía absoluta ante los clientes; tu reputación la construyes con tu trabajo.

1.2. ¿Por qué rechazaron mi documento de identidad?
Las razones más comunes son:
• La foto está borrosa, oscura o tiene reflejos que impiden leer el DNI.
• El documento está vencido o deteriorado.
• La selfie no coincide con la foto del DNI.
• Los nombres registrados en la App no coinciden exactamente con el documento físico.

1.3. ¿Cómo recibo los pagos de mis servicios?
Servi NO interviene ni gestiona los pagos. Tú acuerdas el precio y el método (efectivo, Yape, transferencia) directamente con el cliente por WhatsApp o llamada. Recomendamos pedir un adelanto si el trabajo lo justifica y emitir comprobante si eres formal. Cualquier disputa por impago debe resolverse directamente con el cliente o mediante denuncia policial.

1.4. ¿Qué hago si un cliente me extorsiona o comete un delito?
Si el incidente es grave (robo, agresión, extorsión), repórtalo desde la opción de soporte en la App. Dentro de los límites legales, proporcionaremos tu información de registro a las autoridades competentes (PNP o Ministerio Público) para que puedas interponer tu denuncia. Servi no se responsabiliza por los actos ilícitos de terceros.

1.5. ¿Cómo protejo mi teléfono y ubicación para evitar acosos?
En la configuración de tu perfil tienes "Toggles de Privacidad". Puedes ocultar tu número de teléfono, tu enlace de WhatsApp o tu ubicación exacta en el mapa. Ten en cuenta que ocultar estos datos reduce la facilidad de contacto directo, pero aumenta tu privacidad. El uso de estas herramientas es tu responsabilidad.

2.1. ¿Cómo funciona el sistema de reseñas?
Las reseñas pertenecen a la comunidad y Servi no las elimina arbitrariamente. Sin embargo, si una reseña contiene insultos o demuestra ser falsa, puedes solicitar una Mediación de Perfil para ocultarla temporalmente mientras el equipo de soporte evalúa el caso. El acceso a mediación avanzada puede depender de tu plan de suscripción.

2.2. ¿Cómo funcionan las Subastas (ConfiServ)?
Los clientes publican solicitudes de servicio y tú puedes postular con un precio y mensaje. Si el cliente te elige, estás en la obligación de cumplir. El abandono injustificado o no presentarte generará penalizaciones automáticas en el sistema para proteger la confianza de la comunidad.

2.3. ¿Para qué sirven las Monedas y los Referidos?
Puedes ganar Monedas invitando a otros profesionales con tu código único. Las Monedas son un valor promocional virtual que puedes canjear por beneficios internos (como meses de plan Estándar o Premium). Importante: Las Monedas no son dinero real, no tienen valor fiduciario y no se pueden canjear por efectivo.

2.4. ¿Qué es el Asistente "Ofi"?
Es una Inteligencia Artificial integrada en la app para ayudarte a responder dudas rápidamente. Sus respuestas son meramente informativas y sugestivas. Tú tienes la palabra final en tus negociaciones; Servi no se hace responsable por decisiones basadas exclusivamente en las sugerencias de la IA.

2.5. ¿Por qué se borraron mis mensajes del chat?
Por políticas de privacidad y seguridad, todos los mensajes del chat se eliminan automáticamente de nuestros servidores a los 3 días de enviados. Si necesitas conservar algún acuerdo o prueba, te recomendamos tomar capturas de pantalla a tiempo. Servi no guarda historiales legales.

3.1. ¿Mis datos y documentos están seguros?
Sí. Tus fotos de DNI y selfies se almacenan de forma encriptada y no son visibles para ningún otro usuario. Solo el administrador de la plataforma las consulta exclusivamente para fines de validación de identidad.

PREGUNTAS FRECUENTES

¿Cómo mejoro mi visibilidad?
Completa al 100% tu perfil, agrega fotos de tus trabajos y responde rápido a los mensajes de los clientes.

¿Cómo activo el servicio a domicilio?
Ve a Configuración → Servicio a domicilio y activa el toggle. Tú defines la zona y el costo con el cliente.

¿Cómo subo de plan?
Ve a Configuración → Subir de rango y elige el plan que más te convenga. Puedes pagar con MercadoPago o subiendo el comprobante de Yape.

¿Cómo contacto soporte?
Escribe a soporteofiapp@gmail.com o usa la opción "Reportar un problema" dentro de la App.
''';

const kHelpNegocio = '''
CENTRO DE AYUDA — Negocios y Establecimientos
Servi · 2026

2.1. ¿Qué ventajas tengo al registrar mi RUC?
Registrar tu RUC permite que los clientes verifiquen que eres un negocio formal ante la SUNAT, lo cual aumenta drásticamente tu tasa de clics, llamadas y confianza. Además, habilita campos específicos como Nombre Comercial y Razón Social en tu tarjeta de presentación. Recuerda que publicar tu RUC es de carácter público comercial.

2.2. ¿Cómo funciona el sistema de Delivery y Coordinación?
En tu panel de configuración, puedes activar el toggle de "Tiene Delivery" y/o "Plena Coordinación".
• Plena Coordinación: El cliente entenderá que el costo, la zona de envío y los tiempos se negocian directamente contigo al momento del contacto.
• Importante: Servi no provee el servicio de transporte ni logística. Los accidentes de tránsito, pérdida de mercadería, demoras o incidentes durante el traslado son responsabilidad exclusiva del Negocio o del repartidor que este contrate.

2.3. ¿Puedo tener un perfil de Oficio y uno de Negocio a la vez?
Sí, bajo las siguientes condiciones:
• Debes usar el mismo correo electrónico, pero gestionarás perfiles separados en tu dashboard.
• Cada perfil requiere su propia validación de datos para garantizar la transparencia ante el usuario final.

2.4. ¿Cómo protejo la ubicación de mi local para evitar extorsiones o robos?
Entendemos que exponer una dirección física tiene riesgos. Por ello, en la configuración de tu perfil tienes "Toggles de Privacidad" que te permiten ocultar tu teléfono, WhatsApp o tu pin de ubicación exacta en el mapa. Ten en cuenta que ocultar tu ubicación puede dificultar que los clientes te encuentren, pero incrementa tu privacidad. El uso de estas herramientas de protección es tu decisión y responsabilidad.

2.5. ¿Qué pasa si subo un comprobante de pago (Yape) falso para mi plan?
La revisión de comprobantes es visual. Si se detecta que una captura ha sido manipulada, simulada o corresponde a un pago ajeno, tu solicitud será rechazada y tu cuenta podría ser bloqueada permanentemente, perdiendo el derecho a cualquier reembolso, sin perjuicio de las acciones legales por estafa.

2.6. ¿Cómo funcionan las reseñas si un cliente me pone 1 estrella injustificadamente?
Las reseñas son de la comunidad. Si consideras que una reseña es falsa, dañina o responde a factores ajenos a tu servicio (ej. un repartidor externo se demoró), puedes solicitar una Mediación de Perfil. El equipo de soporte evaluará ocultarla temporal o definitivamente de la vista pública, protegiendo tu reputación.

2.7. ¿Mis mensajes del chat y datos fiscales están seguros?
Sí. Los documentos de SUNAT y comprobantes se almacenan encriptados y solo los ve el administrador. Sobre el chat, por políticas de seguridad, los mensajes se eliminan automáticamente a los 3 días. Servi no guarda historiales; si necesitas conservar un acuerdo o comprobante de un cliente, toma capturas de pantalla a tiempo.

PREGUNTAS FRECUENTES

¿Cómo actualizo mi horario de atención?
Ve a tu perfil de negocio → Editar → Horario. Mantenerlo actualizado evita malas reseñas por encuentrarte cerrado.

¿Cómo activo la opción de delivery?
Ve a Configuración → Servicio a domicilio / Delivery y activa los toggles según tu modelo de negocio.

¿Cómo subo de plan?
Ve a Configuración → Subir de rango y elige el plan que más te convenga (Estándar o Premium) para obtener más visibilidad y funciones.

¿Cómo contacto soporte?
Escribe a soporteofiapp@gmail.com o usa la opción "Reportar un problema" dentro de la App.
''';
// ═══════════════════════════════════════════════════════════════════════
// TÉRMINOS Y POLÍTICAS PARA CLIENTES (Al registrarse en la App)
// ═══════════════════════════════════════════════════════════════════════

const kTermsCliente = '''
TÉRMINOS Y CONDICIONES DE USO — Clientes (Usuarios)
Servi · Versión 2.0 · Junio 2026

Al marcar la casilla de aceptación durante el registro, usted declara haber leído, comprendido y aceptado quedar vinculado jurídicamente por el presente documento, bajo las leyes de la República del Perú.

1. NATURALEZA DEL SERVICIO Y EXENCIÓN DE INTERMEDIACIÓN
1.1. Directorio Tecnológico: Servi funciona exclusivamente como un directorio tecnológico de centralización de información y puente de contacto visual. No es una agencia de empleos, ni actúa como empleador, contratista, socio, ni representante de los Proveedores (Profesionales o Negocios) listados en la plataforma.
1.2. Autonomía Contractual: La relación entre el Cliente y el Proveedor es de naturaleza privada. Servi no interviene en la negociación de precios, condiciones de trabajo, ni en la prestación del servicio final.
1.3. No Intervención en Pagos: Servi no es pasarela de pago, custodio de fondos ni garante de las transacciones. La negociación y el intercambio monetario se realizan extraplataforma (Yape, efectivo, transferencia). Servi no se hace responsable por impagos, cobros excesivos, fraudes financieros o falta de comprobantes de pago por parte del Proveedor.

2. DESLINDE DE RESPONSABILIDAD Y ACEPTACIÓN DE RIESGOS
2.1. Calidad del Servicio: Servi no garantiza la idoneidad técnica, puntualidad, legalidad o calidad del trabajo del Proveedor. Cualquier daño material, personal o patrimonial derivado de una mala praxis o incumplimiento será de responsabilidad exclusiva del Proveedor, debiendo el Cliente dirimir cualquier reclamo directamente con éste o ante las autoridades competentes, liberando expresamente a Servi de toda responsabilidad.
2.2. Delitos de Terceros: El Cliente reconoce que al contratar servicios de desconocidos, ya sea en su domicilio o en un local externo, existen riesgos inherentes. Servi no se hace responsable por robos, estafas, extorsiones, acosos o cualquier otro ilícito cometido por el Proveedor o terceros. Se recomienda tomar medidas de seguridad básicas.
2.3. Validaciones Digitales: Ningún sistema digital es infalible. La contratación de servicios bajo la exclusiva responsabilidad del Cliente.

3. SISTEMA DE VERIFICACIÓN E INSIGNIA "CONFIABLE"
3.1. Limitación de la Insignia: La insignia "Confiable" constituye únicamente un indicador de que el Proveedor ha cumplido con entregar documentación (DNI/RUC) que coincide con registros públicos superficiales. De manera enunciativa mas no limitativa, NO constituye una garantía absoluta de honestidad, solvencia moral, ausencia de antecedentes penales o pericia profesional.
3.2. El Cliente que contrata basándose únicamente en este distintivo lo hace bajo su propio riesgo. Servi se reserva el derecho de revocar la insignia en cualquier momento.

4. SUBASTAS (CONFISERV) Y PENALIZACIONES
4.1. Uso del Sistema: El Cliente puede publicar solicitudes de servicio. Al aceptar una oferta de un Proveedor, se genera un compromiso contractual directo entre las partes.
4.2. Penalización por Uso Frivoloso: No seleccionar a ningún oferente en tres (3) subastas consecutivas activas generará un bloqueo preventivo de la función por siete (7) días calendario, con el fin de desincentivar el desgaste injustificado de los profesionales que ofertaron su tiempo.

5. ASISTENTE IA ("OFI"), MONEDAS Y CHAT
5.1. IA Informativa: Las respuestas del Asistente "Ofi" son de carácter meramente referencial y sugestivo. No constituyen asesoría legal, ni endoso de Servi. El Cliente es el único responsable de la decisión final de contratación.
5.2. Monedas Virtuales: Las "Monedas" son valores promocionales virtuales, intangibles e intransferibles. No son dinero electrónico ni pueden canjearse por efectivo.
5.3. Borrado de Chat: Por políticas de seguridad, los mensajes intercambiados en el chat son eliminados de forma automática e irreversible a los tres (3) días calendario. Servi no actúa como custodio de pruebas legales. Se recomienda tomar capturas de pantalla de acuerdos importantes.

6. RESEÑAS Y MENORES DE EDAD
6.1. Autenticidad: Las reseñas deben basarse en experiencias reales y verificables. El uso de GPS o código QR es obligatorio para validar la veracidad de la crítica. Servi podrá sancionar o bloquear cuentas que generen reseñas falsas o maliciosas.
6.2. Menores de Edad: El uso de la plataforma está permitido a mayores de catorce (14) años, quienes requieren autorización expresa de sus padres o tutores legales para registrarse y contratar servicios. Los padres asumen toda la responsabilidad por la actividad y seguridad del menor.

Última actualización: Junio 2026
''';

const kPrivacyCliente = '''
POLÍTICA DE PRIVACIDAD — Clientes (Usuarios)
Servi · Versión 2.0 · Junio 2026

1. IDENTIDAD DEL RESPONSABLE DEL TRATAMIENTO
Servi (en adelante "La Plataforma"), con domicilio operativo en la ciudad de Huancayo, departamento de Junín, Perú, actúa como responsable del tratamiento de los datos personales de los usuarios clientes, en estricto cumplimiento de la Ley N° 29733, Ley de Protección de Datos Personales, y su Reglamento.

2. DATOS RECOLECTADOS Y FINALIDAD
Para la operatividad de la cuenta de Cliente, se recolecta:
• Datos Identificativos: Nombre completo, apellido y correo electrónico. Finalidad: Creación de cuenta, autenticación y recuperación de acceso.
• Datos de Contacto: Número de celular (opcional). Finalidad: Notificaciones push y recuperación de cuenta.
• Datos de Ubicación: Departamento, provincia, distrito y GPS en tiempo real. Finalidad: Sugerir proveedores cercanos, calcular distancias en subastas (Haversine) y validar la autenticidad de las reseñas (verificar que el Cliente estuvo en el establecimiento en un radio ≤500m o escaneó el código QR del Proveedor). 
• Datos de Interacción: Historial de servicios contratados, reseñas emitidas, favoritos, saldo de "Monedas" (valor promocional virtual) y participaciones en subastas.
• Interacciones con Asistente IA ("Ofi"): Los textos ingresados en el chat de asistencia IA son procesados exclusivamente para generar respuestas, aplicándose filtros automáticos de redacción de datos sensibles (PII) en la salida.

3. SEGURIDAD, RETENCIÓN Y BORRADO DE INFORMACIÓN
3.1. Mensajería (Chat): Por políticas de privacidad y seguridad informática, los mensajes intercambiados en el chat de la aplicación son eliminados de forma automática e irreversible transcurridos tres (3) días calendario desde su envío. La Plataforma no almacena ni actúa como custodio de historiales de conversaciones.
3.2. Almacenamiento: Los datos del Cliente se almacenan en bases de datos seguras (Supabase PostgreSQL) y caché temporal (Upstash Redis) mientras exista la relación contractual o hasta que el Usuario ejerza su derecho de supresión.

4. TRANSFERENCIA Y ENCARGADOS DE TRATAMIENTO
Para la prestación del servicio tecnológico, los datos interactúan exclusivamente con los siguientes encargados bajo estándares de seguridad:
• Supabase (PostgreSQL): Gestión de base de datos y autenticación.
• Upstash (Redis): Caché de sesiones y cuotas de la app.
• Firebase Auth & FCM: Autenticación social (Google, Facebook, TikTok) y notificaciones push.
• Brevo: Envío de correos transaccionales (OTP, recuperación de contraseña).
• Autoridades Competentes: Los datos serán puestos a disposición ante requerimiento judicial o de la autoridad fiscalizadora competente. En casos de fraude o ilícitos reportados, se colaborará con la víctima o las autoridades facilitando los datos de identificación del presunto infractor.

5. DERECHOS ARCO (Ley N° 29733)
El Cliente puede ejercer en cualquier momento sus derechos de Acceso, Rectificación, Cancelación y Oposición respecto al tratamiento de sus datos personales, enviando una comunicación al canal oficial de soporte: soporteofiapp@gmail.com.

Última actualización: Junio 2026
''';