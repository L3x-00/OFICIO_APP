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
1. **Luego**: Chatbot IA (Hito 6)
2. **Luego**: Despliegue producción (Hito 7)

---

## 📞 Contacto de Módulos

- **Mobile**: `mobile/lib/features/`
- **Backend**: `backend/src/`
- **Admin**: `admin/app/`
- **Prisma Schema**: `backend/prisma/schema.prisma`

