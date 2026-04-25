1. Especificaciones de Diseño UI/UX (Estilo Yape)
Para que la pantalla se sienta nativa y genere confianza, el diseño en Flutter debe seguir estas directrices visuales:
Paleta de Colores Principal:
Fondo/Primario: Morado Yape (Aproximadamente un #740B70 o #800080 vibrante).
Acentos: Turquesa/Cian (Aproximadamente #00E4C3) para botones secundarios o resaltados.
Textos: Blanco sobre fondos morados, y gris oscuro/negro sobre fondos blancos (tarjetas de contenido).
Tipografía:
Una fuente limpia y redonda (como Nunito, Montserrat o Roboto).
Uso de negritas para los montos y títulos principales.
Elementos Gráficos:
Bordes redondeados pronunciados en botones y tarjetas (estilo pill o rounded corners).
El logo de Yape en la parte superior para dar contexto.
Carga local del código QR usando la ruta estática: assets/images/yape/QR.jpeg.
Carga local del logo de yape usando la ruta estática: assets/images/yape/yape logo.png.
2. El Flujo del Usuario (User Journey en Flutter)
Este es el comportamiento exacto que el desarrollador debe programar en la aplicación móvil:
Paso 1: Pantalla de Resumen de Compra
El proveedor selecciona su plan (Ej: Plan Negocio).
Se abre la vista de pago tematizada con los colores de Yape.
Se muestra en grande el Monto exacto a pagar y el Código QR centrado en la pantalla (cargado desde tus assets).
Paso 2: Botón de Acción Principal (Redirección)
Debajo del QR, habrá un botón grande y llamativo (Morado oscuro o Cian) que diga: "Pagar con Yape" o "Abrir Yape".
Lógica oculta: Al presionar este botón, la app debe usar un Deep Link (o manejador de URLs) para detectar si la aplicación de Yape está instalada en el celular y abrirla automáticamente. Si no está instalada, debe mostrar un mensaje amigable pidiendo que se escanee el QR manualmente.
Paso 3: Formulario de Verificación (Comprobante)
Una vez que el usuario hace la transferencia y regresa a tu app, encontrará la sección de validación justo debajo (o en el siguiente paso del modal):
Botón de Subida de Imagen: Un área punteada o un botón con el icono de una cámara/galería que diga "Subir captura del Yape".
Campo de Código (Estricto): Un campo numérico diseñado específicamente para aceptar solo 3 números. Debe tener un texto de ayuda que diga: "Ingresa los 3 dígitos de verificación de tu operación".
Campo de Descripción (Opcional): Un área de texto libre (con límite de caracteres) que diga "Nota adicional (Opcional)". Útil si alguien pagó desde el celular de su pareja y necesita aclararlo.
Paso 4: Envío y Estado Pendiente
El usuario presiona "Enviar comprobante".
La app muestra una pantalla de éxito (Check verde) con el mensaje: "¡Recibimos tu pago! Estamos validando la información. Tu plan se activará en breve".
El usuario es redirigido a su perfil, donde su estado de suscripción se muestra como "Validación en proceso".
3. El Flujo del Backend & Panel Admin
Para que el sistema sea integral, Claude deberá conectar el móvil con tu NestJS y Next.js así:
Recepción (NestJS): El backend recibe la foto, los 3 números y la nota. Sube la foto al contenedor oficio_minio y guarda el registro en Postgres con estado PENDING.
Validación (Next.js): Tú entras al panel de administración. Tienes una tabla llamada "Pagos por Aprobar". Ves la foto del voucher, el número de 3 dígitos y el monto.
Aprobación: Si el dinero está en tu cuenta, presionas "Aprobar". El backend cambia el estado de la suscripción del usuario, y la próxima vez que el proveedor abra la app, ya tendrá sus funciones Premium habilitadas.
4. Integrar los movimiento en el panel del provedor o negocio, ajustalo y ve donde sería ideal integrar la parte de movimientos "pagos realizados" o una bandeja de esas acciones.
# RELGA DE ORO, NO ALTERAR OTRAS FUNCIONALIDADES A MENOS QUE CORRESPNDAN.
# verificar la funcionalidad total de lo implementado