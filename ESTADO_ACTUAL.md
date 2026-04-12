# OficioApp — Estado Actual del Proyecto

**Última actualización**: 2026-04-09
**Estado**: Más allá del Hito 5.8 (en transición hacia Hito 6)

---

## 📊 Resumen Ejecutivo

OficioApp es un marketplace de servicios locales para ciudades intermedias del Perú (Huancayo, Huanta) con **3 aplicaciones funcionales**:
- ✅ App móvil Flutter (clientes y proveedores)
- ✅ Backend NestJS con JWT, PostGIS, Redis, MinIO
- ✅ Panel admin Next.js con CRUD, métricas y moderación

**Stack de Lenguajes**: TypeScript 81.4%, Dart 14.8%, C++ 1.9%, CMake 1.4%, Swift 0.2%, HTML 0.1%

---

## ✅ Hitos Completados (0-5.8+)

| Hito | Estado | Qué incluye |
|------|--------|-----------|
| **0-1** | ✅ Completo | Docker, Prisma, JWT, AuthProvider, SecureStorage |
| **2** | ✅ Completo | ServiceCard, Sistema de colores, Diseño base |
| **3** | ✅ Completo | Listado de proveedores, filtros, caché Redis, detalle con mapa |
| **4** | ✅ Completo | Sistema de reseñas, validación GPS+QR, upload de fotos |
| **5** | ✅ Completo | Panel admin, dashboard, 8 métricas, moderación de reseñas |
| **5.5** | ✅ Completo | Feature-First architecture, ApiInterceptor tipado, autenticación centralizada |
| **5.6** | ✅ Completo | Logout, ProfileScreen, OnboardingScreen animado, FavoritesProvider global, Admin CRUD |
| **5.7** | ✅ Completo | SplashScreen, WelcomeScreen con carrusel, LoginScreen, JoinUsModal animado, planes de suscripción |
| **5.8+** | 🔄 Avanzado | Panel proveedor 3 tabs (Perfil, Servicios, Métricas), gestión de categorías, registro de servicios |

---

## 🚧 En Desarrollo y Observaciones Priorizadas

### **Tier 1: Crítico - Bloquea UX**

1. **Manejo de Fotos de Perfil** (Mobile + Backend)
   - Problema: Al cambiar entre cuentas guardadas, las fotos desaparecen
   - Afecta: Perfil de usuario, perfil profesional, perfil negocio
   - Impacto: Usuario pierde confianza en la app

2. **Sistema de Reseñas - Error y Persistencia** (Mobile + Backend)
   - Problema: Error "instance of 'ValidationException'" al publicar reseña
   - Comportamiento: Reseña se guarda en backend pero:
     - Error bloquea UI
     - Error dice "reseña ya publicada" en reintentos
     - Reseña no aparece en detalle de proveedor (UI)
     - Pero al volver atrás, la reseña sí existe
   - Causa: Desincronización frontend-backend
   - Impacto: Usuario no puede dejar reseñas confiadamente

3. **Categoría de Servicios - No se puede seleccionar** (Mobile + Backend)
   - Problema: Formulario de registro profesional/negocio NO tiene selector de categoría
   - Comportamiento: Siempre se pone categoría predeterminada (Electricista)
   - Afecta: Búsqueda y filtrados
   - Impacto: Proveedores aparecen en categoría incorrecta

### **Tier 2: Importante - UX incompleta**

4. **Lógica de Roles y Botones de Usuario** (Mobile + Backend)
   - Regla: Usuario puede tener 3 roles (cliente, profesional, negocio)
   - Botón "Quiero ser proveedor" debe mostrar opciones basadas en roles actuales:
     - Cliente solo → opción "Ser profesional" + "Tener negocio"
     - Cliente + Profesional → opción solo "Tener negocio"
     - Cliente + Negocio → opción solo "Ser profesional"
     - Los 3 roles → botón desaparece
   - Impacto: UX confusa, usuario no entiende opciones

5. **Detalles de Proveedor Incompleto** (Mobile)
   - Problema: Al hacer clic en tarjeta → abre detalle pero faltan datos
   - Debe mostrar:
     - Para profesional: nombre, foto, teléfono/correo, servicios ofrecidos
     - Para negocio: foto, nombre negocio, teléfono/correo, servicios
   - Impacto: Cliente no tiene información completa para decidir

6. **Pantalla de Inicio - Falta botón "Quiero ser cliente"** (Mobile)
   - Problema: Modal "Quiero ser parte" solo muestra "Soy profesional" y "Tengo negocio"
   - Falta: Botón "Quiero ser cliente" que redirija a registro como cliente
   - Impacto: Flujo inconsistente, usuario no ve opción clara

7. **Formulario de Servicios - No auto-completa datos** (Mobile + Backend)
   - Problema: Al registrar servicios, el formulario no pre-llena datos del perfil
   - Ejemplo: Si usuario modificó teléfono en perfil → no aparece en formulario servicios
   - Impacto: Duplicidad de data entry, mala UX

### **Tier 3: Importante - Nuevas funcionalidades requeridas**

8. **Sistema de Notificaciones** (Mobile + Backend + WebSockets)
   - Notificaciones requeridas:
     - Nuevo proveedor registrado → notificación admin "listo para verificación"
     - Proveedor → cliente confirmación (aprobado/rechazado)
     - Usuario → "cambiaste contraseña"
     - Proveedor → "XXX dejó una reseña"
     - Otras notificaciones relevantes
   - Falta: Bandeja de notificaciones en app móvil
   - Implementación: WebSockets ya preparados (Pusher), solo falta UI

---

## 🏗️ Arquitectura Técnica Actual

### Frontend (Flutter 3.41.6)
- Feature-First architecture
- Provider pattern (ChangeNotifier)
- Dio client con interceptores JWT
- SecureStorage para tokens
- Validación GPS + QR para reseñas

### Backend (NestJS 11)
- Monolito modular (auth, users, providers, reviews, admin, provider-panel)
- Prisma 7 con PostGIS
- JWT (access 15min, refresh 7d)
- Redis para caché (categorías, proveedores)
- MinIO para almacenamiento de fotos
- Rate limiting global
- WebSockets preparados para notificaciones

### Admin (Next.js 15)
- SSR con Tailwind v3
- Recharts para análisis
- CRUD completo de proveedores
- Dashboard con 8 métricas
- Moderación de reseñas

---

## 🔧 Cómo Ejecutar

```bash
# Infraestructura
docker-compose up -d

# Backend
cd backend && npm install && npm run start:dev

# Admin panel
cd admin && npm install && npm run dev

# Mobile
cd mobile && fvm flutter pub get && fvm flutter run -d chrome
```

---

## 📋 Stack Tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| **Mobile** | Flutter | 3.41.6 |
| **Mobile Language** | Dart | 3.x |
| **Backend** | NestJS | 11.x |
| **Backend Language** | TypeScript | ESM |
| **Admin** | Next.js | 15 |
| **Database** | PostgreSQL | 16 + PostGIS |
| **Cache** | Redis | 7.2 |
| **Storage** | MinIO | (S3 compatible) |
| **Auth** | JWT | (bcrypt hashing) |

---

## 🎯 Próximos Pasos Priorizados

1. **URGENTE**: Resolver manejo de fotos (Tier 1)
2. **URGENTE**: Resolver sistema de reseñas (Tier 1)
3. **CRÍTICO**: Selector de categorías (Tier 1)
4. **IMPORTANTE**: Lógica de roles (Tier 2)
5. **IMPORTANTE**: Detalles de proveedor (Tier 2)
6. **IMPORTANTE**: Sistema de notificaciones (Tier 3)
7. **Luego**: Chatbot IA (Hito 6)
8. **Luego**: Despliegue producción (Hito 7)

---

## 📞 Contacto de Módulos

- **Mobile**: `mobile/lib/features/`
- **Backend**: `backend/src/`
- **Admin**: `admin/app/`
- **Prisma Schema**: `backend/prisma/schema.prisma`

