
# OBJETIVO PRINCIPAL: Transformar la interfaz actual de "básica funcional" a "premium profesional con identidad visual distintiva". La aplicación es un marketplace de servicios locales que conecta clientes con profesionales verificados en Perú. El diseño actual funciona pero carece de personalidad, animaciones sofisticadas, jerarquía visual clara y elementos interactivos que comuniquen calidad y confianza.

CONTEXTO TÉCNICO EXISTENTE:

Stack: Next.js 15+ (App Router), TypeScript strict, Tailwind CSS v3, Recharts, socket.io-client, lucide-react, sonner, date-fns, zod
Arquitectura: 42 archivos organizados en 8 configuraciones, 11 páginas, 17 componentes, 5 librerías/utilidades, 2 archivos adicionales
Paleta de colores obligatoria: tema oscuro (#0B0D17 fondo, #15192B tarjetas, #1E2235 inputs, #E07B39 primario naranja, #FFFFFF texto principal, #B0B8C8 secundario, #6B7280 muted)
El sistema ya tiene funcionalidad completa, seguridad implementada, middleware de autenticación, panel de gestión, landing page, login, WebSocket. NO necesitas agregar nuevas funcionalidades, solo mejorar drásticamente la presentación visual y la interactividad.
RESTRICCIONES CRÍTICAS:

Trabaja EXCLUSIVAMENTE dentro de la carpeta web/
MANTIENES toda la lógica de negocio, validaciones, llamadas a API, tipos TypeScript, seguridad existentes
NO cambias nombres de archivos, rutas, estructura de carpetas
NO agregues nuevas dependencias pesadas (solo CSS animations, transiciones nativas, o librerías ligeras si es absolutamente necesario)
Todo debe ser responsive mobile-first
Preserva la paleta de colors exacta especificada
Cada mejora debe justificarse con un propósito UX claro (no decoración vacía)
SECCIÓN 2: METODOLOGÍA DE TRABAJO Y RECEPCIÓN DE ARCHIVOS
PROCESO DE COLABORACIÓN:

Tienes contron total y acceso de todo el proyecto, permisto toal para ejecutar comandos necesarios para llegar a complir co este objetivo

FORMATO DE ENTREGA ESPERADO:

Código limpio, bien indentado, siguiendo los estándares existentes del proyecto
Comentarios estratégicos en puntos clave de mejora (no comentar cada línea, solo decisiones importantes)
Si agregas nuevos utilitarios o helpers (como hooks de animación), explícalos brevemente antes del código
Indica si alguna mejora requiere ajustes en archivos de configuración (tailwind.config.ts, globals.css, etc.)
SECCIÓN 3: FILOSOFÍA DE DISEÑO Y PRINCIPIOS RECTORES
Antes de tocar cualquier línea de código, internaliza estos principios que deben guiar cada decisión:

PRINCIPIO 1: JERARQUÍA VISUAL EXPLÍCITA

El usuario debe entender en 2 segundos qué es lo más importante en cada pantalla
Usa contraste de tamaño (títulos 2.5x-3x más grandes que body text), peso de font (bold vs regular), color (primario naranja para CTAs, muted para secundario) y espaciado (más aire alrededor de elementos importantes)
Nunca dos elementos compitan por atención igual
PRINCIPIO 2: MOVIMIENTO CON PROPÓSITO

Cada animación comunica algo: entrada = bienvenida, hover = interactuabilidad, loading = proceso activo, cambio de estado = transición suave
Duraciones: entradas 400-600ms (staggered), hovers 200-300ms, loading loops 800-1200ms
Usando functions (cubic-bezier(0.16, 1, 0.3, 1)) para movimientos naturales, no linear
Evita animaciones que distraigan de la tarea principal
PRINCIPIO 3: PROFUNDIDAD Y CAPAS

Crea sensación de espacio con: sombras sutiles con color tinte naranja (no grises planos), glassmorphism ligero (backdrop-blur con fondo semitransparente), bordes con gradiente sutil, overlays con gradiente radial para focalizar atención
Fondo nunca plano: usa gradientes radiales sutiles, patrones de grid muy tenue (opacity 0.03-0.05), o noise texture sutil
PRINCIPIO 4: FEEDBACK INMEDIATO Y CLARO

Todo elemento interactivo responde instantáneamente: botones se elevan (translateY(-2px)) + sombra más intensa al hover, inputs brillan sutilmente (box-shadow con color primario) al focus, tarjetas inclinan ligeramente (rotateY(2deg)) al hover
Loading states: skeleton screens con shimmer animation (gradiente que se desliza), spinners con el color primario, progress bars con transiciones suaves
Estados de error: shake animation suave + borde rojo + mensaje en tooltip o debajo del campo
Estados de éxito: checkmark animation + verde temporal + confetti sutil (opcional en acciones importantes)
PRINCIPIO 5: MICRO-INTERACCIONES QUE DELITAN

Botones: ripple effect al hacer click (onda que se expande desde el punto de contacto)
Checkboxes/radios: animación de scale bounce al seleccionar
Toggle switches: snap con spring physics
Contadores: números que cuentan animadamente de 0 al valor real (countUp animation)
Tabs: indicator slide suave entre opciones
Notificaciones toast: slide-in desde derecha/arriba con spring back
Modales: backdrop blur + escala desde 0.95 a 1 + fade in
PRINCIPIO 6: RENDIMIENTO PRIMERO

Animaciones preferentemente en transform y opacity (GPU-accelerated)
Evita animar height, width, top, left (trigger layout reflow)
Usa will-change sparingly solo en elementos que animan frecuentemente
Lazy loading para imágenes below-the-fold con placeholder blur
Intersection Observer para scroll-triggered animations (no scroll event listener)
Reduce motion para usuarios con preferencia de movimiento reducido (prefers-reduced-motion media query)
SECCIÓN 4: MEJORAS ESPECÍFICAS POR COMPONENTE/SECCIÓN
4.1 CONFIGURACIÓN GLOBAL (Archivos base)
tailwind.config.ts:

Extender la paleta con variantes de color para estados: primary-hover (más claro), primary-light (para fondos sutiles), primary-glow (para sombras)
Agregar custom animations keyframes: fadeInUp, slideInLeft, slideInRight, scaleIn, shimmer, float, pulse-soft, countUp
Configurar transitionTimingFunction por defecto: cubic-bezier(0.16, 1, 0.3, 1)
Agregar boxShadow con color tinte: 'glow-sm': '0 0 10px rgba(224, 123, 57, 0.3)', 'glow-md': '0 0 20px rgba(224, 123, 57, 0.4)', 'glow-lg': '0 0 30px rgba(224, 123, 57, 0.5)'
Agregar backgroundImage patterns sutiles: grid-pattern, dots-pattern, noise-texture (usando SVG data URI inline)
globals.css:

Importar fuente system-ui con fallbacks claros
Definir custom properties (CSS variables) para toda la paleta de colores (facilita temas futuros)
Crear clases utilitarias globales: .glass-card (backdrop-blur-xl bg-white/5 border border-white/10), .gradient-border (border-image con gradiente naranja), .text-gradient (background-clip text con gradiente primario)
Definir keyframes complejos: shimmer (para skeletons), float (para elementos decorativos), pulse-glow (para indicadores activos), slide-up-fade (para entradas escalonadas)
Agregar scrollbar styling personalizado (width thin, thumb con color primario opaco, track transparente)
Smooth scrolling global: html { scroll-behavior: smooth }
Selection color personalizado:: selection { background: rgba(224, 123, 57, 0.3); color: white }
layout.tsx (raíz):

Agregar metadata SEO mejorada con Open Graph tags
Envolver children en un provider de tema (aunque sea oscuro fijo ahora, prepararlo para futuro toggle)
Agregar estructura de loading global con skeleton screen
Implementar Toaster de sonner con posición bottom-right, tema oscuro personalizado, rich colors true
Asegurar que Navbar y Footer envuelvan correctamente el contenido con espaciado adecuado
middleware.ts:

Mantener lógica exacta de autenticación (NO TOCAR LÓGICA)
Solo mejorar: mensajes de redirección más claros en query params si aplica
4.2 LANDING PAGE (page.tsx raíz + componentes de sección)
Hero Section (hero-section.tsx):

Layout: Contenedor con min-h-screen, padding generoso, centrado vertical en desktop, stack en móvil
Fondo: Gradiente radial desde centro-arriba con color primario al 10% de opacidad fading a bg principal,叠加 un pattern de grid muy sutil (SVG background con opacity 0.03)
Elementos flotantes decorativos: 3-4 círculos/blobs con blur (filter: blur(60-100px)) en posiciones aleatorias con animación float continua (translateY +/- 20px, duración 8-12s, infinite alternate). Colores: primario opaco, amber opaco, azul sutil opaco. Estos dan profundidad sin distraer.
Título principal:
Texto grande (text-5xl md:text-7xl font-bold)
Aplicar animación de entrada: fadeInUp con stagger delay (palabra por palabra o línea por línea usando span wrappers)
"OficioApp" en gradiente de color (bg-clip-text transparent bg-gradient-to-r from-primary to-amber)
Resto del título en blanco
Line-height ajustado (1.1) para impacto
Subtítulo:
Entrada retardada 200ms después del título
Text-secondary color, tamaño text-lg md:text-xl, max-w-2xl mx-auto, center align
Ligera opacidad inicial que fade in
Botones CTA:
Botón primario ("Iniciar sesión"): bg-primary hover:bg-primary-dark, sombra glow-sm que intensifica a glow-md al hover, translateY(-2px) al hover, scale active effect (scale-95 al click), ripple effect en click. Icono de arrow-right que se mueve ligeramente right al hover.
Botón secundario ("Descargar app"): border border-white/20 bg-transparent hover:bg-white/5 hover:border-primary/50, mismas transiciones suaves. Icono de download.
Espaciado entre botones: gap-4
Ambos con focus-visible ring offset (accesibilidad)
Imagen/mockup decorativo:
Posicionada absolute o relative en lado derecho en desktop, oculta o stacked en móvil
Con animación de entrada slide-in desde derecha con delay 500ms
Efecto de float sutil continuo (movimiento vertical lento 6s)
Sombra dramática con color tinte (shadow-2xl con color primario 20%)
Borde redondeado grande (rounded-3xl)
Opcional: reflection effect abajo (flip vertical con mask fade out)
Badge de confianza (debajo de botones):
Text pequeño: "Más de 10,000 profesionales verificados"
Icono de shield-check
Entrada con fade-in delay 800ms
Separación del contenido principal con margin-top
Benefits Section (benefits-section.tsx):

Título de sección: "¿Por qué elegir OficioApp?" con fadeInUp animation al entrar en viewport
Grid de tarjetas: 4 columnas en desktop, 2 en tablet, 1 en móvil, gap-6
Cada tarjeta:
Fondo: bgCard con border border-white/5
Border radius: rounded-2xl
Padding: p-6 md:p-8
Estado normal: shadow-sm, transition-all duration-300
Hover state (MEJORAR DRÁSTICAMENTE):
translateY(-8px) elevación
Sombra: glow-md con color primario
Border: cambia a border-primary/30 con transición suave
Icono interior: scale(1.1) + cambio de color a primario
Fondo sutil: bg-gradient-to-b from-primary/5 to transparent (aparece al hover)
Opcional: efecto de shine/glint que pasa por la tarjeta (pseudo-element con gradiente que se translateX de -100% a 100% en 600ms)
Entrada en viewport: staggered reveal (cada tarjeta aparece con 100ms de delay respecto a la anterior) usando Intersection Observer
Icono (lucide-react): tamaño 3xl (w-12 h-12), color text-muted que cambia a primary en hover, contenedor circular con bg-primary/10 rounded-xl
Título: font-semibold text-lg text-primary mt-4 mb-2
Descripción: text-secondary text-sm leading-relaxed
Las 4 tarjetas específicas con iconos correctos:
ShieldCheck: "Profesionales Verificados" - "Validación de identidad y documentos oficiales para tu tranquilidad"
MapPin: "Reseñas Geolocalizadas" - "Opciones reales confirmadas con GPS, sin falsificaciones"
CreditCard: "Pagos Seguros" - "Integración con Yape, el método de pago más confiable de Perú"
HeartHandshake: "Soporte Local" - "Equipo peruano que entiende las necesidades de tu ciudad"
How It Works Section (how-it-works-section.tsx):

Título: "Cómo Funciona" con subtitulo explicativo breve
Layout: Timeline horizontal en desktop (flex row con conectores visuales), vertical en móvil (flex col)
3 pasos numerados:
Cada paso en una card similar a benefits pero más compacta
Número del paso: círculo grande (w-12 h-12) con bg-primary text-white font-bold rounded-full, posicionado absolute o relativo con connector line (línea punteada o sólida entre pasos)
Icono del paso debajo o al lado del número
Título en bold, descripción en text-secondary
Animación: staggered entrance desde abajo (fadeInUp) al scroll, cada paso con 150ms delay
Hover: ligera elevación + número pulsa suavemente (pulse animation)
Conector visual entre pasos: línea horizontal en desktop (height 2px, bg-gradient-to-r from-primary/50 to-transparent), vertical en móvil
Paso 1: Search icon - "Busca al Experto" - "Filtra por categoría, ubicación y calificación"
Paso 2: MessageCircle icon - "Contacta Directamente" - "Comunica por WhatsApp o llamada telefónica"
Paso 3: Star icon - "Califica el Servicio" - "Deja tu reseña verificada con GPS"
Testimonials Section (testimonials-section.tsx):

Título: "Lo Que Dicen Nuestros Usuarios"
Grid: 3 columnas desktop, 1 columna móvil, gap-6
Cada testimonio card:
Fondo bgCard, border border-white/5, rounded-2xl, p-6
Comillas decorativas: icono Quote grande (text-6xl) en esquina superior, color primary opacity-20
Avatar: imagen circular (w-16 h-16) con border-2 border-primary/30, positioned absolute o relative top de la card con overlap (-mt-8 si card tiene padding top)
Nombre: font-semibold text-textPrimary
Ubicación/Ciudad: text-xs text-muted flex items-center gap-1 (MapPin icon)
Testimonio texto: text-secondary italic text-sm leading-relaxed, comillas incluidas
Estrellas: row de 5 iconos Star llenos con color amber
Hover: ligero lift (translateY(-4px)) + shadow increase
Entrada: fadeInUp staggered al viewport
Los 3 testimonials (datos ficticios realistas):
María García - Huancayo - "Encontré un plomero excelente en minutos. El servicio fue rápido y profesional."
Carlos Mendoza - Huanta - "Como negocio, OficioApp me ha triplicado los clientes. Altamente recomendado."
Ana Rodríguez - Lima - "Me encanta poder ver reseñas reales con ubicación. Me siente segura contratando."
Stats Section (stats-section.tsx):

Fondo: ligeramente diferente al main (ej. bg-gradient-to-b from-bg to-bgCard)
Título: "OficioApp en Números"
Grid de 4 métricas (desktop) o 2x2 (móvil):
Cada métrica: texto grande (text-4xl md:text-5xl font-bold color primary) + label pequeño (text-secondary)
ANIMACIÓN CLAVE: Counter animation - cuando la sección entra en viewport, el número cuenta desde 0 hasta el valor real en 2 segundos con easing out (usa requestAnimationFrame o librería ligera de countUp)
Ejemplos: "10,000+" Profesionales, "50,000+" Servicios Realizados, "4.9/5" Rating Promedio, "15+" Ciudades Cubiertas
Separadores visuales sutiles entre métricas (border-r border-white/10 excepto última en fila)
Icono pequeño arriba de cada número relacionado con la métrica
Image Carousel (image-carousel.tsx):

Diseño: Carrusel de screenshots/mockups de la app o fotos de servicios
Transiciones: crossfade suave (opacity + scale sutil) o slide horizontal con cubics-bezier natural
Indicadores: dots abajo, dot activo con bg-primary y scale-1.2, otros con bg-white/30
Flechas de navegación: círculos con bg-white/10 hover:bg-white/20, iconos ChevronLeft/Right, aparecen al hover en el contenedor
Autoplay: cada 5 segundos, pausar al hover
Imágenes: object-cover, rounded-xl, shadow-lg con color tinte
Lazy loading: solo cargar visible + 1 a cada lado
Touch/swipe support en móvil (drag horizontal)
CTA Provider Section (cta-provider-section.tsx):

Fondo: gradiente llamativo (from-primary/20 via-bgCard to-primary/10) o pattern diagonal
Título grande: ¿Tienes un Negocio o Profesión?
Subtítulo: Únete a miles de profesionales que ya crecen con OficioApp
Botón CTA prominente: "Registrarme Como Profesional" - bg-primary hover:bg-primary-dark, size large, glow effect
Layout: centered, max-w-3xl, padding generous (py-20)
Elemento decorativo: íconos flotantes de diferentes profesiones (herramientas, estetoscopio, llave inglesa) con float animation y opacity baja alrededor del texto
4.3 NAVEGACIÓN Y LAYOUT
Navbar (navbar.tsx):

Posición: fixed top-0, w-full, z-50
Fondo inicial: transparente o bg-bg/80 backdrop-blur-md (glass effect)
Al hacer scroll > 50px: cambiar a bg-bg/95 backdrop-blur-xl con border-b border-white/5, añadir shadow-sm (transición suave 300ms)
Logo: imagen + texto "OficioApp", texto en font-bold text-xl, hover: scale-105 transición
Links de navegación:
Inicio, Características, Descargar App
Color: text-secondary hover:text-white, position relative
Underline effect al hover: pseudo-element ::after con height 2px bg-primary, width 0% al inicio, 100% al hover, transición 300ms, positioned bottom-0
Link activo: text-primary con underline permanente
Botón "Iniciar Sesión":
Variante outline o filled según sección (filled en landing, outline en otras)
Hover effects consistentes con resto de CTAs
Mobile menu (hamburger):
Icono Menu/X con animación de morphing (3 líneas se convierten en X)
Panel deslizante desde derecha o dropdown desde navbar
Backdrop overlay con fade in/out
Links apilados verticalmente con stagger animation al abrir
Each link has: padding generous, border-bottom border-white/5 last-none, hover:bg-white/5
Efecto adicional: subtle box-shadow con color primario muy sutil en el borde inferior
Footer (footer.tsx):

Fondo: bg-card o ligeramente más oscuro que main
Layout: grid 4 columnas desktop, stack móvil
Columna 1: Logo + descripción corta de la app (1-2 líneas)
Columna 2: Enlaces rápidos (Inicio, Login, Descargar App)
Columna 3: Legal (Términos, Privacidad)
Columna 4: Contacto (email, redes sociales icons)
Separador superior: border-t border-white/5, height 1px
Copyright: texto centrado abajo, text-muted text-sm
Redes sociales: iconos circulares con bg-white/5 hover:bg-primary hover:text-white transition
Año dinámico: new Date().getFullYear()
Spacer: padding-top y bottom generosos (py-12)
4.4 PÁGINA DE LOGIN (login/page.tsx + login-form.tsx)
Layout de página:

Fondo: igual que landing (gradient radial sutil) o image background con overlay oscuro si hay foto de profesionales/trabajo
Centrado vertical y horizontal: min-h-screen flex items-center justify-center
Padding generoso: p-4 md:p-8
Tarjeta de login:

Fondo: bgCard
Ancho: max-w-md w-full
Border: border border-white/10
Rounded: rounded-2xl (o rounded-3xl para look más moderno)
Shadow: xl con color tinte sutil (shadow-2xl shadow-primary/10)
Padding: p-8 md:p-10
Animación de entrada: scaleIn (desde 0.95 a 1) + fadeIn, duración 400ms
Efecto optional: borde con gradiente sutil (pseudo-element con bg-gradient con blur)
Contenido interno:

Logo: centrado, tamaño moderado (w-20 h-20), margin-bottom 6, con animación de entrada separate (fade-in-down delay 100ms)
Título: "Inicia sesión en OficioApp" - text-2xl font-bold text-center, mb-2
Subtítulo: "Tu portal de gestión profesional" - text-secondary text-sm text-center, mb-8
Formulario campos:
Espaciado entre campos: space-y-5
Cada campo:
Label: text-sm font-medium text-secondary mb-2 block (FLOATING LABEL IMPLEMENTATION):
Posición: absolute dentro del input, translate-y full cuando vacío, translate-y-0 text-xs cuando foco o tiene valor
Color: text-muted -> text-primary al focus/hover
Transición: all 200ms cubic-bezier(0.16, 1, 0.3, 1)
Background del input debe ser solid para que label no se vea detrás
Input container: relative
Icono izquierdo: position absolute left-3 top-1/2 -translate-y-1/2, color text-muted -> text-primary al focus
Input:
Background: bgInput
Border: border border-white/10 rounded-xl
Padding-left: pl-10 (espacio para icono)
Padding-right: pr-10 (si tiene botón toggle)
Focus state: border-color primary, ring-2 ring-primary/20, box-shadow glow-sm (sin layout shift)
Hover state (antes de focus): border-white/20
Transición: all 200ms
Campo contraseña específico:
Botón ojo (Eye/EyeOff) en position absolute right-3: color text-muted hover:text-white, toggle visibility con state
Password strength indicator (si aplica en registro, opcional en login): barra debajo del input con segmentos de color (rojo->amarillo->verde según fortaleza)
Checkbox "Mantener sesión":
Custom checkbox styling: appearance-none w-5 h-5 rounded bg-bgInput border border-white/20 checked:bg-primary checked:border-primary transition, con icono de check blanco que aparece con scale animation
Label al lado: text-sm text-secondary
Botón submit ("Ingresar"):
Width: w-full
Padding: py-3 px-6
Background: bg-primary hover:bg-primary-dark
Text: white font-semibold
Border-radius: rounded-xl
Transition: all 200ms
Hover: translateY(-1px) shadow glow-sm
Active: scale-[0.98] (feedback táctil)
Disabled state (rate limiting): opacity-50 cursor-not-allowed, sin hover effects, spinner interno
Loading state: texto oculto, spinner (Loader2 icon de lucide-react) girando con animation spin, mismo padding
Rate limiting visual:
Después de 5 intentos fallidos: mostrar contador regresivo en lugar de botón
Texto: "Intenta de nuevo en {segundos}s"
Fondo: bg-red-500/10 border border-red-500/30 text-red-400
Animación: pulse suave en el borde
Countdown: número en bold, actualizándose cada segundo
Link de registro:
Texto: "¿No tienes cuenta?" + "Descarga la app" como link
Link: text-primary hover:text-primary-dark underline-offset-4 hover:underline
Alineación: text-center mt-6
Validación y errores:

Error message debajo de cada campo inválido:
Texto: text-xs text-red-400 mt-1 flex items-center gap-1 (AlertCircle icon)
Animación: fadeIn + slideDown (aparece desde altura 0)
Fondo: none o red-500/5
Shake animation en el input al submit con error (translateX +/- 5px 3 veces, 300ms total)
4.5 PANEL DE AUTOGESTIÓN (panel/*)
Layout del Panel (panel/layout.tsx):

Estructura: Sidebar izquierda (fixed) + Content area (ml-sidebar-width en desktop)
Sidebar:
Width: w-64 (256px) en estado expandido, w-20 en colapsado
Background: bgCard (ligeramente diferente al content bg-bg)
Border-right: border border-white/5
Height: h-screen sticky top-0
Z-index: z-40
Transición de colapso: width 300ms cubic-bezier(0.16, 1, 0.3, 1)
Toggle button: botón en top-right o bottom del sidebar con icono PanelLeftClose/Open, bg-white/5 hover:bg-white/10 rounded-lg p-2
Logo en sidebar: versión pequeña, colapsado muestra solo icono
Navegación:
Lista vertical con gap-1 p-4
Cada item:
Flex row items-center gap-3 px-4 py-3 rounded-xl
Icono: w-5 h-5, color text-muted
Texto: text-sm font-medium (oculto en colapsado, mostrado en tooltip al hover)
Activo: bg-primary/10 text-primary border-l-4 border-primary (o bg-primary/15 rounded-xl)
Hover (no activo): bg-white/5 text-white hover:bg-white/10
Transición: all 150ms
Indicator de notificación: badge small (rojo) con count en esquina superior derecha del icono si hay notificaciones
Items: Inicio (Home), Perfil (UserCog), Ofertas (Zap con badge), Servicios (Package), Estadísticas (BarChart3), Ajustes (Settings)
Bottom section:
Separador: border-t border-white/5 my-4
User info (expandido): avatar pequeño + nombre truncado + role badge
Logout button: text-red-400 hover:text-red-300 hover:bg-red-500/10 w-full justify-start rounded-xl mt-2
Content area:
Padding: p-6 md:p-8
Min-height: min-h-screen
Background: bg (principal)
Mobile responsive:
Sidebar oculto por defecto (translateX -100%), overlay backdrop
Hamburger button en top-left del content area (fixed z-50)
Bottom navigation bar (alternative o complementaria): fixed bottom-0 w-full bg-card border-t border-white/5, flex row justify-around py-2, each item icon + label tiny, active item with primary color
Content area con pb-20 (space for bottom nav)
Panel Home Tab (panel/page.tsx):

Welcome card:
Background: gradient from-primary/20 to-bgCard (o pattern sutil)
Border: border border-primary/20
Rounded: rounded-2xl
Padding: p-6
Layout: flex row items-center gap-4
Avatar: w-16 h-16 rounded-full border-2 border-primary/30
Text: "Hola, {Nombre}" en text-2xl font-bold, subtitle con role
Plan badge: pill shape (rounded-full) bg-primary/20 text-primary text-xs font-semibold px-3 py-1
Animación: fadeInLeft al montar
Metrics grid:
Grid 2x2 (desktop) o 1 columna (móvil), gap-4
Cada metric card:
Background: bgCard border border-white/5 rounded-xl p-4
Icono: grande (w-10 h-10) con bg-primary/10 rounded-lg p-2, color primary
Valor: text-2xl font-bold (counter animation de 0 al valor)
Label: text-xs text-secondary mt-1
Hover: lift sutil (+ shadow)
Entrada: staggered fadeInUp con delay
Métricas: VisitasPerfil (Eye icon), ClicksWhatsApp (MessageCircle), ClicksLlamada (Phone), RatingPromedio (Star)
Recent reviews section:
Título: "Últimas Reseñas"
Lista de mini-cards (máximo 3):
Flex row items-start gap-3 p-3 bg-card rounded-lg
Avatar pequeño + nombre + estrellas (iconos Star amber) + comentario truncado (line-clamp-2)
Fecha relativa (hace 2 horas, ayer)
Link "Ver todas" text-primary hover:underline text-sm
Share profile button:
Sticky bottom o dentro de welcome card
Variant: outline con icono Share2
Click action: copiar URL al clipboard + toast success "¡Enlace copiado!"
Toast: sonner con icono de check
Panel Perfil Tab (panel/perfil/page.tsx + profile-form.tsx):

Layout: formulario largo con secciones separadas visualmente
Secciones (cada una con card contenedora):
Avatar y portada:
Portada: rectángulo ancho completo (aspect-ratio 21:9) con bg-gradient o imagen, botón de cámara superpuesto en esquina inferior derecha (circle bg-primary hover:bg-primary-dark), hover: overlay con icono + texto "Cambiar foto"
Avatar: circle grande (w-24 h-24) posicionado overlapping la portada (negative margin-top), border-4 border-bg (o border-card), botón cámara superpuesto
Drag and drop zone: border-2 border-dashed border-white/20 hover:border-primary/50 rounded-xl p-8 text-center, drag over: border-primary bg-primary/5, icono Upload cloud size grande, texto "Arrastra imágenes aquí o haz clic"
Preview grid: imágenes en grid 3-4 columnas, cada una con relative positioning, botón eliminar (X circle) en esquina superpuesta appears on hover
Información básica:
Campos en grid 2 columnas (desktop) 1 columna (móvil)
Inputs con floating labels (igual que login pero adaptado)
Textarea para descripción: resize-y, min-height 100px
Validación visual en tiempo real:
Campo válido: border-green-500/50 (sutil)
Campo inválido: border-red-500 + mensaje error
Checkmark verde aparece a la derecha cuando es válido (para campos required)
Redes sociales:
Campos colapsables o siempre visibles en accordion style
Cada campo con icono de la red social correspondiente (color brand specific si es posible)
Placeholder: "https://tu-perfil.com/tuusuario"
Horario:
Visual editor: lista de días (Lun-Dom), cada uno con:
Toggle switch (abierto/cerrado) custom styled
Dos selects/time inputs (apertura, cierre)
Row highlight alternado o separado por borders
Día actual destacado sutilmente (bg-primary/5)
Galería:
Grid responsive de imágenes
Drag handle para reorder (icono GripVertical appears on hover)
Upload button: card dashed border con plus icon
Límite indicator: "3/5 imágenes" con progress bar (bg-primary para usado, bg-white/10 para restante)
Botón guardar cambios:
Fixed bottom o sticky bottom en móvil
Full width, large padding
State changes: default -> hover -> loading (spinner) -> success (checkmark + green temporary) -> back to default
Success toast: "Perfil actualizado correctamente"
Panel Ofertas Tab (panel/ofertas/page.tsx):

Tabs o toggle: "Oportunidades Disponibles" | "Mis Ofertas Enviadas"
Lista de oportunidades:
Card por oportunidad:
Border-left accent: 4px solid color según estado (green=abierta, red=cerrada, gray=expirada)
Header: categoría badge (bg-primary/20 text-primary) + presupuesto range (font-bold text-lg)
Body: descripción truncada, distancia con MapPin icon, countdown timer (texto rojo si < 24h)
Footer: botón "Postular" (bg-primary hover:bg-primary-dark)
Empty state (si no hay oportunidades):
Ilustración o icono grande (Inbox icon, size 12xl, color text-muted/30)
Texto: "No hay oportunidades disponibles en este momento"
Subtexto: "Vuelve pronto o ajusta tus categorías de interés"
Animación: float sutil en la ilustración
Modal de postulación:
Backdrop blur + scale in animation
Campo precio con prefijo "S/." (S/)
Campo textarea mensaje
Botón enviar con loading state
Cancel button con variant ghost
Panel Servicios Tab (panel/servicios/page.tsx + services-list.tsx):

Header: título + botón "Añadir Servicio" (icono Plus) + indicador de límite ("2/3 servicios")
Progress bar de límite: barra visual debajo del header, verde si espacio, amarilla si 80%, roja si 100%
Lista/Cards de servicios:
Card: bgCard border rounded-xl p-4 hover:shadow-md transition
Imagen si tiene (aspect-ratio 16:9 object-cover rounded-lg mb-3)
Título: font-semibold
Descripción: text-sm text-secondary line-clamp-2
Precio: text-primary font-bold (si aplica)
Acciones: menú de 3 puntos (kebab menu) o botones edit/delete que appear on hover/right side
Formulario añadir/editar (modal o inline expansion):
Campos: nombre, descripción, precio, imagen upload
Validación + save/cancel buttons
Empty state: similar a ofertas pero con icono Package + CTA "Añadir tu primer servicio"
Panel Estadísticas Tab (panel/estadisticas/page.tsx + stats-charts.tsx):

Upsell state (plan gratis):
Card centrada max-w-lg mx-auto
Icono: Lock grande (w-20 h-20) text-muted/30
Título: "Estadísticas Exclusivas"
Subtítulo: "Desbloquea insights detallados con Plan Estándar o Premium"
Lista de beneficios con checkmarks (icono CheckCircle green):
"Ve tus visitas diarias y horarios pico"
"Compara tu crecimiento semana a semana"
"Mide el rendimiento de tus servicios"
"Identifica tus clientes más frecuentes"
CTA button: "Ver Planes" -> navigate to ajustes
Decoración: gradiente sutil de fondo, ilustración abstracta de gráfico tenuemente visible
Estado premium (con datos):
Selector de período: tabs o segmented control (7 días | 30 días | 90 días) - estilo pill toggle
Gráfico de líneas (visitas):
Recharts LineChart con área fill (gradient de primary opacity 20 a transparent)
Tooltip custom styled (bg-card border rounded-lg shadow)
Ejes con color text-muted, grid lines sutil (white/5)
Responsive container (aspect ratio o height fijo)
Gráfico de barras (WhatsApp vs Llamadas):
BarChart con barras agrupadas o stacked
Colors: primary para WhatsApp, amber para llamadas
Legend custom
Resumen metrics row (tarjetas pequeñas con totales):
Total visitas este período
Total contactos
Ranking en categoría (si aplica)
Loading state: skeleton screens para charts (rectángulos con shimmer animation)
Panel Ajustes Tab (panel/ajustes/page.tsx):

Sección Plan Actual:
Card con nombre del plan, badge de color (gris/azul/dorado), precio, fecha de inicio
Visual: icono Crown para Premium, Star para Estándar, Package para Gratis
Planes Disponibles (accordion o grid):
3 cards comparativas:
Cada card: border rounded-xl p-6, hovered/recomendado tiene border-primary glow
Plan name + price/mes prominent
Lista de features con checkmarks (icono Check)
Button: "Plan Actual" (disabled) o "Adquirir" (primary)
Popular badge: "Más Popular" ribbon en esquina superior para Estándar
Flujo de Pago Yape (Modal):
Trigger: click en "Adquirir"
Modal design:
Step indicators arriba (1. Escanear 2. Pagar 3. Confirmar)
QR Code image display centrado (grande, con border rounded-xl shadow)
Instrucciones numbered list con iconos
Upload comprobante: drag-drop zone (similar a perfil images)
Input código verificación 3 dígitos (OTP style, auto-focus next input)
Botón "Enviar Comprobante" con loading y success states
Success state: confetti o checkmark animation grande + mensaje "¡Pago en revisión! Te notificaremos en 24h."
Disponibilidad toggle:
Segmented control o toggle switches:
DISPONIBLE (green bg-green-500/20 text-green-400 border-green-500/30)
OCUPADO (amber bg-amber-500/20 text-amber-400)
CON_DEMORA (red bg-red-500/20 text-red-400)
Transición suave entre estados (background color slide)
Modales legales:
Buttons: text-sm text-secondary hover:text-primary underline
Modal: scrollable content, title, close button, texto legal formateado (párrafos, listas)
Reportar problema:
Button/text-link que abre modal
Textarea con label
Submit button
Toast success: "Reporte enviado, gracias por tu feedback."
4.6 PANEL CLIENTE (cliente/page.tsx)
Similar layout al panel proveedor pero simplificado
Header card: avatar + nombre + email + rol badge "Cliente"
Secciones en cards:
Mis Solicitudes: lista con status badges (color coded)
Mis Reseñas: estrellas + comentario + proveedor nombre
Favoritos: grid de mini-cards con foto, nombre, unfavorite button (heart icon filled red)
Banner CTA profesional:
Card con gradient background
Texto: "¿Ofreces servicios profesionales?"
Dos buttons: "Registrarme como Profesional" / "Registrar mi Negocio"
Iconos decorativos
4.7 COMPONENTES ADICIONALES REUTILIZABLES
Layout Shell (layout-shell.tsx):

Wrapper component que proporciona estructura consistente
Props: children, className, withPadding, withMaxWidth
Maneja loading states globales
Transiciones de ruta (si aplica)
Yape Payment Modal (yape-payment-modal.tsx):

Reusable modal component para flujo de pago
Props: isOpen, onClose, planName, price, onSubmit
Internal steps state management
Animation: slide up from bottom (mobile) or scale in (desktop)
Backdrop: bg-black/60 backdrop-blur-sm
Sidebar Component (sidebar.tsx):

Extraído como componente controlado
Props: isCollapsed, onToggle, activeRoute, user, onLogout
Responsive behavior encapsulated
Collapsible with animation
SECCIÓN 5: PATRONES DE INTERACTIVIDAD Y ANIMACIONES GLOBALES
5.1 SCROLL-TRIGGERED ANIMATIONS (Intersection Observer)

Implementar un hook personalizado useScrollAnimation o utilidad:

javascript

// Concepto (NO escribir código aún, solo especificar comportamiento)
// Observa elementos con atributo data-animate
// Cuando entran en viewport (threshold 0.1), añade clase 'is-visible'
// Clase is-visible dispara CSS transitions definidas
// Tipos de animación soportados via data-animation-type:
// - fade-up (default): opacity 0->1, translateY 30px->0
// - fade-left: opacity 0->1, translateX -30px->0
// - fade-right: opacity 0->1, translateX 30px->0
// - scale-in: opacity 0->1, scale 0.9->1
// - stagger: hijos con delay incremental (data-stagger-delay ms)
// Una vez animado, no repetir (threshold: once)
// Respecta prefers-reduced-motion: salta animaciones, muestra contenido directamente
Aplicar en:

Todas las secciones de la landing page (benefits, how-it-works, testimonials, stats, CTA)
Cards dentro de listas (servicios, ofertas, estadísticas)
Títulos de sección
5.2 COUNTER ANIMATION (useCountUp Hook)

Para números estadísticos:

javascript

// Concepto
// Recibe: endValue, duration (ms = 2000), startValue = 0
// Usa requestAnimationFrame para smooth increment
// Easing function: easeOutExpo (rápido al inicio, lento al final)
// Formatea números con locale (es-PE) para separadores de miles
// Soporta decimales si es necesario
// Se dispara cuando elemento entra en viewport
// Muestra valor final formateado con sufijo (+, k, M si es muy grande)
Usar en:

Stats section (landing)
Metric cards (panel home)
Cualquier número que represente conteo total
5.3 MICRO-INTERACTION LIBRARY (CSS Classes)

Definir clases globales para patrones comunes:

.hover-lift: transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg
.hover-glow: transition-shadow duration-300 hover:shadow-[0_0_20px_rgba(224,123,57,0.3)]
.hover-scale: transition-transform duration-200 hover:scale-105
.interactive-card: combina lift + glow + border-transition
.press-effect: active:scale-[0.98] transition-transform
.shimmer-loading: animación de gradiente que se mueve (para skeletons)
.pulse-soft: animación de opacity sutil 0.8->1->0.8 (para indicadores vivos)
.float-slow: animación translateY +/- 10px 6s infinite alternate (elementos decorativos)
.shake: animación shake para errores (translateX +/- 5px 3 veces)
5.4 LOADING STATES

Skeleton screens: Para cualquier contenido que carga async (listas, cards, tablas)
Rectángulos con bg-gray-700/50 rounded
Shimmer overlay: gradiente linear que se mueve de -100% a 100% en 1.5s infinite
Dimensiones aproximadas al contenido real (evitar layout shift)
Usar en: lista de servicios cargando, estadísticas cargando, perfil cargando
Spinners: Para acciones puntuales (botones, modals)
Loader2 icon de lucide-react con animate-spin
Color: primary o current color
Size: consistente con contexto (sm en botón, md en card, lg en page)
Progress bars: Para uploads o procesos largos
Height: h-2 rounded-full bg-gray-700 overflow-hidden
Fill: h-full bg-primary rounded-full transition-all duration-500 ease-out
Porcentaje textual opcional al lado
5.5 TOAST NOTIFICATIONS (sonner library integration)

Configuración global:

Position: bottom-right (desktop), bottom-center (móvil)
Theme: dark (customizar colores para match palette)
Rich colors: true (error=red, success=green, warning=amber, info=blue)
Duration: 4000ms (auto dismiss)
Close button: true
Icons: true (usar lucide-react icons por tipo)
Tipos de toasts usar:

Success: "Cambios guardados correctamente" (al guardar perfil)
Error: "Error al conectar con el servidor" (falla API)
Info: "Tienes una nueva oferta en Subastas" (WebSocket event)
Warning: "Tu sesión expirará en 5 minutos" (timeout warning)
5.6 EMPTY STATES

Diseñar empty states atractivos y orientados a acción:

Estructura:

Container: centrado, padding generous (py-16), max-w-md mx-auto
Icono: grande (w-24 h-24), color text-muted/30, con animación float-slow
Título: text-xl font-semibold text-secondary mt-6
Descripción: text-sm text-muted text-center mt-2 max-w-sm mx-auto
CTA button (opcional): si hay acción principal que el usuario puede tomar
Ilustración: si aplica, imagen o SVG decorativo (puede ser abstracto)
Ejemplos:

Sin servicios: "Aún no has añadido servicios" + botón "Añadir servicio"
Sin ofertas: "No hay oportunidades disponibles" + texto "Vuelve pronto"
Sin estadísticas: ver upsell section arriba
Sin favoritos: "No tienes favoritos aún" + "Explora profesionales"
SECCIÓN 6: ACCESIBILIDAD Y RENDIMIENTO
Accesibilidad (WCAG 2.1 AA mínimo):

Contraste de colores: verificar que text-secondary (#B0B8C8) sobre bg (#0B0D17) cumple ratio 4.5:1 (debería cumplir)
Focus visible: todos los elementos interactivos deben tener outline visible al focus (ring-2 ring-primary ring-offset-2 ring-offset-bg)
Skip navigation: enlace oculto "Saltar al contenido" visible al focus al inicio de página
Labels: todos los inputs tienen label asociado (incluso si es visualmente hidden para floating labels)
Roles ARIA: botones, links, modals, dialogs tienen roles correctos
Keyboard navigation: tab order lógico, modals trap focus, escape cierra modals
Motion: respetar prefers-reduced-motion (media query) - deshabilitar o reducir animaciones
Images: alt text descriptivo para todas las imágenes decorativas alt="" funcionales alt="descripción"
Rendimiento:

Optimización de imágenes: usar next/image con sizes, priority para above-fold, placeholder="blur" con blurDataURL si es posible, lazy load para below-fold
Font loading: usar next/font para system fonts (ya optimizado por defecto)
Bundle size: evitar importar librerías enteras si solo usas pocas funciones (ej. importar solo iconos específicos de lucide-react, no la librería entera)
CSS: Tailwind purge automático en producción, evitar estilos inline excesivos
Animaciones: usar transform/opacity principalmente, will-change solo donde es crítico
Code splitting: dynamic import para componentes pesados (modals, charts) con next/dynamic y ssr: false si no necesitan SSR
SECCIÓN 7: INSTRUCCIONES FINALES PARA LA EJECUCIÓN
ORDEN DE TRABAJO RECOMENDADO:

Fase 1 - Fundamentos (Archivos base):

tailwind.config.ts (extender theme con animaciones, sombras, colores)
globals.css (variables CSS, keyframes, utilidades globales, scrollbar)
layout.tsx raíz (metadata, providers, toaster config)
Fase 2 - Landing Page (Impacto visual inmediato):
4. hero-section.tsx (primer impresión crítica)
5. navbar.tsx (navegación persistente)
6. benefits-section.tsx (tarjetas con hover effects)
7. how-it-works-section.tsx (timeline visual)
8. testimonials-section.tsx (prueba social)
9. stats-section.tsx (números con counter animation)
10. image-carousel.tsx (galería dinámica)
11. cta-provider-section.tsx (conversión final)
12. footer.tsx (cierre profesional)
13. page.tsx landing (composición de secciones)

Fase 3 - Autenticación:
14. login-form.tsx (experiencia de login refinada)
15. login/page.tsx (layout de página login)

Fase 4 - Panel de Gestión (Interfaz principal):
16. sidebar.tsx (navegación del panel)
17. panel/layout.tsx (estructura del panel)
18. panel/page.tsx (tab inicio con métricas)
19. profile-form.tsx (formularios complejos)
20. panel/perfil/page.tsx (composición perfil)
21. services-list.tsx + panel/servicios/page.tsx (gestión de servicios)
22. panel/ofertas/page.tsx (subastas)
23. stats-charts.tsx + panel/estadisticas/page.tsx (visualización datos)
24. panel/ajustes/page.tsx (configuración y pagos)

Fase 5 - Panel Cliente y Componentes finales:
25. cliente/page.tsx (vista cliente)
26. layout-shell.tsx (wrapper reutilizable)
27. yape-payment-modal.tsx (modal de pago)

VERIFICACIÓN DE CALIDAD (CHECKLIST):

Después de cada archivo modificado, verificar:

 -No hay errores de TypeScript (types correctos)
 -No se rompió funcionalidad existente (llamadas API intactas)
 -Las animaciones son suaves (60fps idealmente)
 -Responsive en mobile (375px), tablet (768px), desktop (1280px)
 -Contraste y accesibilidad básica
 -Loading states presentes para operaciones async
 -Hover/focus states claramente visibles
 -Comentarios en cambios clave ([MEJORA VISUAL])
 -No hay console.logs de datos sensibles
 -Paleta de colores respetada exactamente
ENTREGA FINAL ESPERADA:

Todos los 42 archivos modificados con mejoras visuales integradas
Documentación de cambios en forma de resumen ejecutivo organizado por:
Animaciones y transiciones agregadas
Mejoras de interactividad (hover, focus, micro-interactions)
Componentes reutilizables creados (hooks, utilidades)
Optimizaciones de rendimiento aplicadas
Issues conocidos o limitaciones (si las hay)
Instrucciones de prueba: cómo verificar visualmente cada mejora en navegador
Lista de dependencias nuevas (si se agregaron, justificar porqué)
NOTAS IMPORTANTES PARA LA IA EJECUTORA:
ESPECIFICACIÓN DE DISEÑO Y UX, no un brief funcional. La lógica de negocio ya existe, tu trabajo es la CAPA DE PRESENTACIÓN.
Prioriza IMPACTO VISUAL sobre cantidad de características. Es mejor 5 animaciones increíbles que 20 mediocres.
Mantén la coherencia: si las tarjetas de beneficios tienen lift effect al hover, las tarjetas de servicios también. Crea un lenguaje visual consistente.
Piensa en el FLUJO del usuario: ¿Qué siente al entrar? ¿Se siente seguro/profesional? ¿Encuentra lo que busca rápidamente? ¿Disfruta interactuando?
La identidad de marca es "profesionalismo con cercanía peruana". No seas frío/corporativo, tampoco infantil. Encuentra el balance: moderno, limpio, confiable, con personalidad cálida (el naranja ayuda).
Ante la duda, opta por la simplicidad elegante. Menos es más si cada elemento tiene propósito.
Testea mentalmente cada animación: ¿Ayuda a entender la interfaz? ¿Es agradable sin ser molesta? ¿Funciona en móviles lentos?