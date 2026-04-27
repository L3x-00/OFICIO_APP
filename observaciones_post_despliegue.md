Observaciones post‑despliegue – OficioApp
Autenticación y registro

Bucle de ubicación en registro manual
Al registrarme de forma manual, después de introducir mi ubicación y elegir el rol, la aplicación vuelve a pedirme la ubicación, entrando en un bucle.

Perfil no carga tras login con Google
Al registrarme con el botón de Google y acceder a la app, la sección "Mi perfil" no carga el correo logueado con google.

Restablecer contraseña no envía código
Al solicitar restablecer la contraseña, el código de verificación no llega al correo electrónico.

Panel de profesional / negocio
4. Mensaje incorrecto sobre suscripción vencida
Al entrar en el panel de "Profesional/Negocio", aparece en la parte superior el mensaje "tu suscripción venció…". Este mensaje no debe mostrarse si el usuario está en el plan gratuito. Debe cambiarse por un aviso como "Estás en el plan Gratis" con un marco de color verde.

Productos/servicios: cantidad y subida de plan
En la sección "Productos/Servicios" del panel, se debe indicar explícitamente la cantidad de elementos que el usuario puede añadir según su plan actual. También debe mostrarse un botón "Subir de plan" que redirija al flujo de selección de plan y pago. El precio del producto debe mostrarse en soles (S/.).

Estadísticas: botón "Ver planes…" no redirige
En la sección "Estadísticas", el botón "Ver planes…" solo muestra un mensaje informativo. Debe redirigir al flujo de selección de plan.

Ajustes: botón "Renovar" y visualización de planes disponibles
En la sección "Ajustes", dentro del recuadro del plan actual, el botón "Renovar" debe eliminarse. Solo debe visualizarse el plan actual, que cambiará si el usuario adquiere uno superior. Además, los planes disponibles actualmente se muestran en recuadros independientes que saturan la vista; deben ocultarse y mostrarse únicamente al desplegar un botón "Ver planes disponibles".

Doble icono de "volver atrás"
En todo el panel "Profesional/Negocio" hay dos iconos de "volver atrás" (uno flotante y otro junto al menú). Se debe eliminar el icono flotante y conservar solo el que está junto al menú en la parte superior.

Horario de atención en panel "Negocio"
El horario de atención debe permanecer oculto y mostrarse solo al desplegar un botón "Ver/Editar horario".

Validación de datos: cambio de foto solicitada
En el formulario de "Validación de datos", se piden tres fotos de DNI. La última ("foto de DNI del titular del negocio") debe sustituirse por otra foto adicional del negocio.

Rechazo de validación: indicador en rojo y botones de acción
Cuando el proceso de validación es rechazado, en el panel "Perfil" el campo "Confianza y validación" debe mostrarse en rojo, acompañado de dos botones: "Ver detalles del rechazo" y "Volver a solicitar validación".

Al presionar "Ver detalles del rechazo", se debe mostrar el mensaje del administrador con dos opciones: "Aceptar" y "Solicitar revalidación".

El botón "Solicitar revalidación" debe redirigir al formulario de validación con los datos que el usuario ingresó previamente, permitiendo editar o corregir lo necesario.

El mismo flujo debe aplicarse para el panel de "Profesional".

Mensaje emergente al solicitar validación
Al enviar una solicitud de validación (tanto en panel "Negocio" como "Profesional"), debe mostrarse un mensaje emergente de "Validación exitosa". Al mismo tiempo, en el panel, el botón "Solicitar validación de datos" debe cambiar en tiempo real a "Datos validados" (o el estado correspondiente).

Navegación y persistencia de datos
13. Cerrar sesión desde el panel
Al cerrar sesión desde el panel de "Profesional/Negocio" o "Perfil", se debe redirigir inmediatamente a la ventana inicial.

Persistencia de notificaciones y favoritos
Los datos de notificaciones y favoritos deben persistir al cerrar sesión y volver a iniciar.

Planes y pagos
15. Mensaje emergente al activar un plan
Cuando un usuario sube de plan, completa el pago y este es aceptado, debe mostrarse un mensaje emergente en tiempo real con el texto: "Solicitud exitosa, se ha validado el pago y se ha activado el plan [nombre del plan]. Ahora tienes acceso a estos beneficios:", seguido de una lista con los beneficios del plan. El mensaje debe incluir dos botones: "Aceptar" y "Ver detalles".

El botón "Ver detalles" debe abrir un modal con un carrusel que muestre los beneficios del plan adquirido.

Efectos del plan no se aplican al activarlo
Al activar un plan solicitado por un negocio, los efectos del plan (límites, visibilidad, etc.) no se reflejan. Debe aplicarse inmediatamente después de completar el pago.

Eliminación de cuentas y reportes
17. Eliminar perfil "Negocio/Profesional"
El botón "Eliminar" en el panel "Perfil" no funciona. Debe eliminar el perfil por completo de la base de datos, en cascada: fotos, reportes, servicios, notificaciones y todo lo relacionado con ese perfil. Los cambios deben reflejarse en tiempo real en el panel del administrador.

Botón "Eliminar cuenta" desde perfil de usuario
Implementar un botón "Eliminar cuenta" en el perfil del usuario. Debe eliminar la cuenta en cascada junto con todos los datos asociados a ese correo o cuenta.

Reportes y problemas
19. Visibilidad de "Reportar este servicio"
Al presionar una tarjeta de servicio y ver sus detalles, la opción "Reportar este servicio" debe ser más visible. Tras enviar un reporte, debe mostrarse un mensaje de agradecimiento ("Reporte enviado con éxito. Gracias por hacer de esta una comunidad saludable") con un botón de "Aceptar". Además, en el panel del administrador debe recibirse una notificación en tiempo real que redirija a la ventana de reportes.

Botón "Reportar un problema" en perfil de cliente
Añadir en el perfil del cliente un botón "Reportar un problema", similar al que existe en el panel de "Negocio/Profesional".

Formulario de registro y redes sociales
21. Añadir redes sociales en el registro
En el formulario de registro de "Negocio/Profesional", debe añadirse un campo desplegable "Añadir red social" con las siguientes opciones: página web, Instagram, TikTok, Facebook, LinkedIn, Twitter (X), Telegram y WhatsApp (número). Cada opción debe mostrar su icono representativo. Los campos deben ser opcionales y estar ocultos por defecto.

Interfaz del cliente
22. Categorías en la pantalla principal
Quitar las cápsulas visuales de categorías que saturan la vista del cliente. Integrarlas como una opción activable desde el perfil de usuario, por ejemplo: "Mostrar categorías en la pantalla principal".
Flujo de reseñas y notificaciones
Cuando un cliente deja una reseña, la opción "Responder al proveedor" debe permanecer desactivada hasta que el proveedor responda. Si el proveedor no responde, no debe mostrarse.
Al responder el proveedor, tanto el cliente como el proveedor deben recibir una notificación de la nueva respuesta.
23. Revisa y corrige el flujo de subida de imágenes durante el registro de proveedor en la app Flutter. El backend ya funciona (probado con Thunder Client), pero las fotos no se suben desde la app.
    1. Asegúrate de que en `onboarding_screen.dart`, después de llamar a `registerProvider`, se llame a `saveProviderImage` con el `type` correcto (`widget.providerType`).
    2. Verifica que `saveProviderImage` use `MultipartFile` y envíe el token JWT correctamente (el interceptor `ApiInterceptor` debe añadir el header `Authorization`).
    3. Añade logs para depurar: imprime en consola la respuesta del backend al subir la imagen.
    4. Si el formulario de registro no incluye captura de imagen, añade un paso para tomar una foto con `image_picker` y súbela antes de finalizar el onboarding.
Finalmente cambiar el lenguaje de toda al app a español latioamericano.