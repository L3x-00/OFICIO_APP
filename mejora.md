Transforma la aplicación web de OficioApp (carpeta `web/`) para que sea una réplica completa y funcional de la app móvil Flutter, incluyendo el panel de proveedor, el panel de administrador y la experiencia de usuario después del inicio de sesión. Actualmente la web tiene un login funcional pero el panel es extremadamente básico: solo muestra datos del usuario en texto plano, sin diseño, sin las pestañas de gestión que existen en la app (Inicio, Perfil, Ofertas, Servicios, Estadísticas, Ajustes). Tampoco se oculta la barra de navegación pública tras iniciar sesión.

Realiza todas las modificaciones necesarias para cumplir los siguientes requisitos. No uses placeholders: todo debe obtener datos reales del backend (https://oficio-backend.onrender.com) usando los helpers que ya existen en `lib/api.ts` y `lib/auth.ts`.

## 1. Barra de navegación inteligente (`components/navbar.tsx`)

Modifícala para que tenga dos estados:

- **Usuario NO autenticado**: muestra los enlaces públicos actuales (Beneficios, Cómo funciona, Testimonios) y el botón "Iniciar sesión".
- **Usuario autenticado**: oculta esos enlaces públicos y muestra:
  - Avatar circular del usuario (si tiene avatarUrl, usa esa imagen; si no, muestra sus iniciales).
  - Nombre del usuario (firstName).
  - Un menú desplegable con:
    - "Mi Panel" (redirige a `/panel` si es PROVEEDOR/ADMIN, o a `/cliente` si es USUARIO).
    - "Cerrar sesión" (llama a `clearSession()` y redirige a `/`).

La detección de autenticación se hará con la función `isAuthenticated()` y `getUser()` de `lib/auth.ts`.

## 2. Panel de proveedor (`app/panel/`) — Replica exacta del panel de la app Flutter

Actualmente el panel de proveedor está vacío o es muy básico. Debes implementar las mismas 6 pestañas que existen en la app móvil (ProviderPanel en Flutter). El layout debe tener un sidebar en desktop y un bottom navigation en móvil.

### 2.1 Layout del panel (`app/panel/layout.tsx`)
- Sidebar izquierdo con los iconos de lucide-react: Home, UserCog, Zap, Package/Briefcase, BarChart3, Settings.
- Colapsable en desktop (íconos + texto → solo íconos).
- En móvil: barra de navegación inferior fija con los mismos iconos.
- Indicador de pestaña activa con color naranja (#E07B39).
- Botón "Volver al inicio" o "Cerrar sesión" en la parte inferior.

### 2.2 Pestaña "Inicio" (`app/panel/page.tsx`)
- Tarjeta de bienvenida: "Hola, [Nombre del negocio]" con el avatar del proveedor.
- Badge del plan actual: "Plan Gratis" (gris), "Plan Estándar" (azul), "Plan Premium" (dorado).
- Métricas rápidas en 4 tarjetas pequeñas (usando datos reales de `api.getAnalytics()`):
  - Visitas este mes (icono Eye).
  - WhatsApp (icono MessageCircle).
  - Llamadas (icono Phone).
  - Rating promedio (icono Star, con estrellas amarillas).
- Últimas 3 reseñas en mini-tarjetas con estrellas, comentario y nombre del cliente.
- Si no hay reseñas, mostrar un texto amigable: "Aún no tienes reseñas. ¡Comparte tu perfil para recibir la primera!".
- Botón "Compartir mi perfil" (copia al portapapeles una URL ficticia).

### 2.3 Pestaña "Perfil" (`app/panel/perfil/page.tsx`)
Ya tienes un formulario de edición de perfil en `components/profile-form.tsx`. Debes integrarlo aquí junto con:

- **Avatar y galería de fotos**:
  - Mostrar las imágenes reales del proveedor (`provider.images`).
  - Permitir subir nuevas imágenes (usando `api.uploadImage`) y eliminar existentes (usando `api.deleteImage`).
  - Las imágenes se muestran en un grid de miniaturas cuadradas con bordes redondeados.
  - Cada imagen tiene un botón de eliminar (icono Trash2) que aparece al hacer hover.
  - La primera imagen se marca con un badge "Portada".

- **Información básica** (usa el componente `ProfileForm`):
  - Campos: nombre del negocio, descripción, teléfono, WhatsApp, dirección.
  - Botón "Guardar cambios" que llama a `api.updateMyProfile`.

- **Redes sociales** (sección colapsable con botón "Redes sociales"):
  - 8 campos: website, instagram, tiktok, facebook, linkedin, twitterX, telegram, whatsappBiz.
  - Cada campo con un icono representativo de lucide-react.

- **Horario de atención** (sección colapsable "Horario"):
  - 7 días de la semana con campos de texto (ej: "8:00-18:00").

- **Validación de confianza** (TrustValidation):
  - Mostrar el estado actual: "No solicitado", "Pendiente", "Aprobado" (con badge verde) o "Rechazado" (con badge rojo y el motivo del rechazo).
  - Si está aprobado, mostrar un badge "Verificado" con icono Shield.

- **Disponibilidad**:
  - Tres botones toggle: Disponible (verde), Ocupado (ámbar), Con demora (rojo).
  - Al hacer clic, llamar a `api.updateMyProfile({ availability: ... })`.

### 2.4 Pestaña "Ofertas" (`app/panel/ofertas/page.tsx`)
- Lista de oportunidades de subasta obtenidas de `api.getOpportunities()`.
- Cada tarjeta muestra:
  - Categoría (nombre).
  - Descripción truncada a 100 caracteres.
  - Presupuesto (min - max) en S/.
  - Distancia en km (si está disponible).
  - Tiempo restante (countdown con formato "Quedan 3h 20m").
  - Badge "Abierta" (verde).
- Botón "Postular" que abre un modal con:
  - Campo de precio (S/.) numérico.
  - Campo de mensaje (textarea).
  - Botón "Enviar oferta" que llama a `api.submitOffer`.
  - Feedback con toast de éxito o error.
- También mostrar "Mis ofertas enviadas" en una sección secundaria (si el endpoint lo permite).

### 2.5 Pestaña "Productos/Servicios" (`app/panel/servicios/page.tsx`)
Ya tienes el componente `components/services-list.tsx`. Debes integrarlo aquí.

- Obtener el tipo de perfil (`provider.type`) para mostrar "Servicios" (OFICIO) o "Productos" (NEGOCIO).
- Indicador visual de límites según el plan (usar `PlanLimits` de la app Flutter como referencia: Gratis=3, Estándar=6, Premium=ilimitado).
- Si se alcanza el límite, mostrar un banner naranja: "Has alcanzado el límite de tu plan. ¡Sube de plan para añadir más!" con un botón que redirige a la pestaña de Ajustes.
- Botón "Añadir servicio/producto" que abre un modal con campos: nombre, descripción, precio (solo si es NEGOCIO).
- Lista de servicios/productos existentes (los datos pueden ser simulados por ahora si el backend no tiene el endpoint).

### 2.6 Pestaña "Estadísticas" (`app/panel/estadisticas/page.tsx`)
Ya tienes `components/stats-charts.tsx`. Debes integrarlo aquí.

- Si el plan es GRATIS: mostrar un upsell atractivo con icono de candado, 4 beneficios listados y un botón "Ver planes" que redirige a Ajustes.
- Si el plan es ESTANDAR o PREMIUM: mostrar los gráficos reales usando `api.getAnalytics()`.
- Los gráficos deben ser interactivos (tooltips, leyendas) usando Recharts.
- Selector de rango de fechas: 7 días, 30 días, 90 días.

### 2.7 Pestaña "Ajustes" (`app/panel/ajustes/page.tsx`)
Ya está implementada parcialmente. Asegúrate de que cumpla:

- **Plan actual**: tarjeta con nombre del plan, precio, fecha de inicio, estado (activo/vencido).
- **Planes disponibles**: 3 tarjetas (Gratis, Estándar, Premium) con:
  - Precio mensual en S/.
  - Lista de beneficios (con checkmarks verdes).
  - Botón "Adquirir" (solo en Estándar y Premium) que abre el modal de pago Yape (`components/yape-payment-modal.tsx`).
  - Badge "Actual" en el plan contratado.
- **Modal de pago Yape** (ya existe, revisar que funcione correctamente con `api.submitYapePayment`).
- **Disponibilidad**: toggle con los 3 estados.
- **Modales legales**: botones que abran modales con Términos y Condiciones, Política de Privacidad (usa el mismo texto que la app Flutter, `_termsText` de `login_screen.dart`).
- **Reportar un problema**: botón que abra modal con campo de texto y llame al endpoint correspondiente.
- **Cerrar sesión**: botón rojo que llame a `clearSession()` y redirija a `/`.

## 3. Panel de cliente (`app/cliente/page.tsx`)

Este panel es para usuarios con rol USUARIO (sin perfil de proveedor aprobado). Actualmente es básico, necesitas mejorarlo:

- **Perfil del usuario**: avatar (iniciales o imagen), nombre completo, email, teléfono, ubicación (departamento, provincia, distrito).
- **Mis solicitudes de subasta**: lista de solicitudes creadas por el usuario, con estado (abierta, cerrada, expirada) y contador de ofertas recibidas.
- **Mis reseñas**: lista de reseñas que el usuario ha escrito, con estrellas, comentario, y nombre del proveedor reseñado.
- **Favoritos**: grid de tarjetas de proveedores favoritos con foto, nombre, rating, y botón para eliminar de favoritos.
- **Banner para convertirse en proveedor**: "¿Quieres ofrecer tus servicios en OficioApp?" con dos botones estilizados:
  - "Registrarme como Profesional" (icono Briefcase)
  - "Registrar mi Negocio" (icono Store)
  - Ambos redirigen a un placeholder o a la app móvil.

## 4. Diseño visual general

- Mantén la paleta de colores definida en `tailwind.config.ts` (bg-dark: #0B0D17, bg-card: #15192B, primary: #E07B39, etc.).
- Todas las tarjetas deben tener borde sutil (border-white/5) y sombra.
- Las transiciones deben ser suaves (200-300ms).
- Tipografía clara y legible.
- En móvil, el layout debe adaptarse con márgenes adecuados y bottom navigation.
- Los estados de carga deben mostrarse con spinners (no pantallas en blanco).
- Los errores deben capturarse y mostrarse con toasts de sonner.

## 5. Arreglos adicionales

- Corrige los enlaces a `/terminos` y `/privacidad` en el footer: si no existen las páginas, ocúltalos temporalmente (coméntalos) o crea páginas placeholder con contenido genérico.
- Asegúrate de que `getRedirectPath` en `lib/auth.ts` maneje el caso de `user` undefined.
- Añade `console.log` solo en desarrollo, no en producción.
- Usa siempre los tipos definidos en `lib/types.ts`.

## 6. Pruebas

Cuando termines, verifica que:
1. Al iniciar sesión con un usuario PROVEEDOR, se vea el panel completo con las 6 pestañas.
2. Al iniciar sesión con un usuario USUARIO, se vea el panel de cliente.
3. Al iniciar sesión con un usuario ADMIN, se vea al menos el panel de proveedor (o un panel de admin básico si lo prefieres).
4. Al cerrar sesión, la barra de navegación vuelva a mostrar los enlaces públicos.
5. Las imágenes se vean correctamente desde las URLs de Cloudflare R2.
6. Los gráficos de estadísticas se rendericen sin errores.

Realiza todos los cambios en los archivos existentes de la carpeta `web/`. No modifiques otras carpetas del proyecto.