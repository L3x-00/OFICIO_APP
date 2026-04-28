# Documentación Técnica — Portal Web de OficioApp

**Fecha**: 2026-04-27  
**Ubicación**: `web/` (raíz del monorepo)  
**Versión**: 1.0.0-alpha  
**Propósito**: Portal público y panel de autogestión para clientes y proveedores de OficioApp.  

---

## 1. Stack Tecnológico

| Tecnología | Versión | Uso |
|------------|---------|-----|
| **Next.js** | 15.5.15 | Framework React con App Router |
| **React** | 19.x | Biblioteca de interfaces |
| **TypeScript** | 5.x (strict) | Tipado estático |
| **Tailwind CSS** | 3.4.17 | Estilos utilitarios |
| **Recharts** | ^3.8.1 | Gráficos de estadísticas |
| **socket.io-client** | ^4.8.3 | Comunicación en tiempo real con el backend |
| **lucide-react** | ^1.7.0 | Iconos vectoriales |
| **sonner** | ^2.0.7 | Notificaciones toast |
| **date-fns** | ^4.1.0 | Formateo de fechas |
| **zod** | ^3.24.0 | Validación de formularios y respuestas de API |
| **autoprefixer** | ^10.4.20 (transitiva) | PostCSS plugin para prefijos CSS |

---

## 2. Configuración de Archivos

### 2.1 `package.json`
- Scripts: `dev` (puerto 3002), `build`, `start`, `lint`.
- Dependencias principales: next, react, react-dom, tailwindcss, recharts, socket.io-client, lucide-react, sonner, date-fns, zod.
- Dependencias de desarrollo: typescript, @types/react, @types/node, eslint, eslint-config-next.

### 2.2 `tsconfig.json`
- `strict: true`.
- `moduleResolution: "bundler"`.
- Path alias `@/*` para la raíz de la carpeta `web/`.

### 2.3 `next.config.ts`
- Configuración de imágenes remotas permitidas: `**.r2.cloudflarestorage.com`.
- Headers de seguridad: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`.

### 2.4 `tailwind.config.ts`
- Paleta de colores personalizada idéntica a la app móvil (bg-dark, bg-card, bg-input, primary, amber, green, red, etc.).
- Extensión de `borderRadius` con `card: 12px`, `button: 10px`.
- Fuente `system-ui, -apple-system, sans-serif`.

### 2.5 `postcss.config.mjs`
- Plugins: `tailwindcss`, `autoprefixer`.

### 2.6 Variables de Entorno
- `.env.local` (no commiteado):
  - `NEXT_PUBLIC_API_URL=https://oficio-backend.onrender.com`

---

## 3. Estructura de Archivos

web/
├── app/
│ ├── layout.tsx # Layout raíz (Navbar, Footer, Toaster)
│ ├── page.tsx # Landing page pública
│ ├── globals.css # Estilos globales y directivas de Tailwind
│ ├── login/
│ │ └── page.tsx # Página de inicio de sesión
│ ├── panel/ # Panel de proveedor (autogestión)
│ │ ├── layout.tsx # Layout con Sidebar + Bottom Nav móvil
│ │ ├── page.tsx # Tab "Inicio" (métricas, reseñas)
│ │ ├── perfil/
│ │ │ └── page.tsx # Tab "Perfil" (edición, galería, horarios, redes sociales)
│ │ ├── ofertas/
│ │ │ └── page.tsx # Tab "Ofertas" (oportunidades, postular)
│ │ ├── servicios/
│ │ │ └── page.tsx # Tab "Servicios/Productos" (límites, añadir)
│ │ ├── estadisticas/
│ │ │ └── page.tsx # Tab "Estadísticas" (gráficos, upsell)
│ │ └── ajustes/
│ │ └── page.tsx # Tab "Ajustes" (planes, Yape, disponibilidad, legales, reportes)
│ └── cliente/
│ └── page.tsx # Panel de cliente (perfil, solicitudes, reseñas, favoritos, banner proveedor)
├── components/
│ ├── navbar.tsx # Barra de navegación sticky
│ ├── footer.tsx # Pie de página
│ ├── sidebar.tsx # Sidebar del panel (colapsable)
│ ├── hero-section.tsx # Sección héroe de la landing
│ ├── benefits-section.tsx # Tarjetas de beneficios
│ ├── how-it-works-section.tsx # Sección "Cómo funciona"
│ ├── testimonials-section.tsx # Testimonios
│ ├── login-form.tsx # Formulario de login reutilizable
│ ├── profile-form.tsx # Formulario de edición de perfil
│ ├── services-list.tsx # Lista de servicios/productos + límite
│ ├── stats-charts.tsx # Gráficos de estadísticas (Recharts)
│ └── yape-payment-modal.tsx # Modal de pago con Yape
├── lib/
│ ├── api.ts # Cliente HTTP con interceptores JWT y refresh automático
│ ├── auth.ts # Gestión de tokens, sesión, timeout de inactividad
│ ├── socket.ts # Conexión WebSocket con auth JWT
│ ├── types.ts # Interfaces TypeScript (User, Provider, Review, etc.)
│ └── validators.ts # Esquemas Zod para formularios
├── middleware.ts # Protección de rutas /panel y /cliente
├── public/
│ └── images/
│ └── logo/ # Logos de la app (logo_light.png, logo_dark.png)
├── next-env.d.ts # Tipos de Next.js
└── .env.local # Variables de entorno locales (no commiteado)

---

## 4. Estado Actual del Desarrollo

### 4.1 Funcionalidades completas
- Landing page con secciones: Hero, Beneficios, Cómo funciona, Testimonios.
- Página de login con validación Zod, rate limiting visual y llamada real al backend.
- Protección de rutas con middleware (redirige a /login si no hay token).
- Panel de proveedor con 6 tabs (Inicio, Perfil, Ofertas, Servicios/Productos, Estadísticas, Ajustes).
- Panel de cliente con perfil, solicitudes, reseñas, favoritos y banner de registro.
- Formulario de edición de perfil (básico, redes sociales colapsables, horario colapsable, galería de fotos con subida/eliminación).
- Modal de pago Yape (QR, comprobante, código de verificación).
- Gráficos de estadísticas con Recharts (vista upsell si plan Gratis).
- Conexión WebSocket con autenticación JWT (socket.io-client).
- Renovación automática de token JWT.
- Timeout de inactividad (30 min) con redirección a login.
- Componentes reutilizables (Navbar, Footer, Sidebar, StatsCharts, YapePaymentModal, etc.).

### 4.2 Errores corregidos recientemente
1. **Importación de CSS**: Se creó `next-env.d.ts` con referencias a tipos de Next.js.
2. **Iconos no existentes en lucide-react**: Reemplazos de Instagram, Facebook, Linkedin, Twitter por alternativas (Camera, Globe, Send, MessageCircle).
3. **Falta de autoprefixer**: Instalado manualmente.
4. **Tailwind v3 vs v4**: Configuración de PostCSS corregida para Tailwind v3.

### 4.3 Limitaciones conocidas
- El tab "Servicios/Productos" aún no muestra datos reales del backend (espera a que el backend implemente el endpoint de servicios).
- La geolocalización por GPS para detectar departamento/provincia/distrito no está integrada en la web (solo se usa en la app móvil).
- El cambio global de iconos SVG (Material Icons → thesvg) se aplicó solo para redes sociales, no para el resto de la UI.

---

## 5. Integración con el Backend

- **URL base**: `https://oficio-backend.onrender.com` (definida en `NEXT_PUBLIC_API_URL`).
- **Autenticación**: JWT enviado en header `Authorization: Bearer <token>`. Almacenado en `localStorage`.
- **Refresh token**: Renovación automática ante 401.
- **WebSocket**: `wss://oficio-backend.onrender.com`, token pasado en `socket.handshake.auth.token`.
- **Endpoints consumidos** (lista no exhaustiva):
  - `POST /auth/login`
  - `GET /provider-profile/me`
  - `PATCH /provider-profile/me`
  - `POST /provider-profile/me/images`
  - `DELETE /provider-profile/me/images/:id`
  - `GET /subastas/opportunities/me`
  - `POST /subastas/offers`
  - `POST /payments/yape`
  - `GET /users/me`
  - `GET /providers/categories`

---

## 6. Despliegue en Vercel

### Parámetros de configuración
- **Root Directory**: `web`
- **Framework Preset**: Next.js
- **Build Command**: `next build`
- **Output Directory**: `.next`
- **Variable de entorno**:
  - `NEXT_PUBLIC_API_URL` = `https://oficio-backend.onrender.com`
- **Dominio sugerido**: `oficio-web.vercel.app`

### Pasos para desplegar
1. Asegurar que todos los cambios estén commiteados y pusheados a GitHub.
2. Crear nuevo proyecto en Vercel, conectar el repositorio.
3. Especificar Root Directory `web`.
4. Agregar la variable de entorno.
5. Deploy.

---

## 7. Consideraciones de Seguridad

- **No se almacenan tokens en cookies** (solo en localStorage con CSP en `next.config.ts`).
- **Rate limiting visual en login**: 5 intentos fallidos → bloqueo de 60s.
- **Validación estricta con Zod** en todos los formularios.
- **Sanitización de datos del backend** antes de renderizar (defensa en profundidad).
- **Protección de rutas** con middleware de Next.js.
- **Timeout de inactividad** que limpia la sesión.
- **Validación de archivos** antes de subir (tamaño máximo 5MB, formatos JPG/PNG/WebP).
- **Headers de seguridad HTTP** configurados en `next.config.ts`.

---

## 8. Próximos Pasos

1. **Pruebas de integración** con el backend real (crear un proveedor, subir fotos, enviar oferta, pago Yape).
2. **Implementar endpoints faltantes** en el backend para servicios/productos.
3. **Agregar loading states** y skeletons donde aún no existen.
4. **Internacionalización** (i18n) si se requiere multi-idioma.
5. **Migrar a cookies httpOnly** para los tokens JWT (más seguro que localStorage).

---

## 9. Notas para la IA

- Todos los componentes están escritos en TypeScript estricto.
- La paleta de colores está centralizada en `tailwind.config.ts`.
- La autenticación y comunicación con el backend se realiza a través de los helpers en `lib/api.ts` y `lib/auth.ts`.
- Los tipos de datos están definidos en `lib/types.ts`.
- Para agregar nuevas páginas protegidas, añadir la ruta al `middleware.ts`.
- Para modificar la landing, editar `app/page.tsx` y los componentes en `components/`.