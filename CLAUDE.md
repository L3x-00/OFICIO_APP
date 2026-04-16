# Caveman Mode: Active
Terse like caveman. Technical substance exact. Only fluff die.
Drop: articles, filler, pleasantries, hedging.
Fragments OK. Short synonyms. Code unchanged.
Pattern: [thing] [action] [reason]. [next step].
---
# Karpathy Coding Principles
- **Think Before Coding**: State assumptions. Surface tradeoffs. Stop if confused.
- **Simplicity First**: No speculative code. No bloated abstractions. 100 lines < 1000.
- **Surgical Changes**: Only touch requested code. Match existing style. No drive-by refactoring.
- **Goal-Driven**: Loop until success criteria are met. Test-first when possible.

---
# OficioApp — Guía de Desarrollo Optimizado

**Última actualización**: 2026-04-09
**RTK Habilitado**: Sí (ahorrador de tokens 60-90%)
**Estado del Proyecto**: Hito 5.8+ (8 críticos pendientes)

---

## 🎯 Contexto Rápido

**OficioApp** = Marketplace de servicios locales para ciudades intermedias del Perú.
- **3 apps**: Flutter (cliente+proveedor), NestJS backend, Next.js admin
- **Modelo**: Clientes gratis, proveedores pagan suscripción
- **Mercado**: Electricistas, gasfiteros, peluquerías, restaurantes, etc.

**Ubicación docs**:
- Estado actual: `./ESTADO_ACTUAL.md` (leer primero)
- Observaciones priorizadas: `./OBSERVACIONES_PRIORIZADAS.md` (bugs a arreglar)

---

## 📁 Estructura del Proyecto

```
C:\Users\Usuario\oficio_app\
├── mobile/                  # Flutter (Dart)
│   ├── lib/core/           # Constants, Network, Errors
│   ├── lib/features/       # Feature-First: auth, providers_list, favorites, reviews, provider_dashboard
│   ├── lib/shared/         # Widgets reutilizables
│   └── pubspec.yaml
├── backend/                 # NestJS (TypeScript ESM)
│   ├── src/
│   │   ├── auth/           # JWT, registro, login
│   │   ├── users/          # Gestión de usuarios
│   │   ├── providers/      # Listado, detalle, analytics
│   │   ├── reviews/        # Reseñas + validación GPS/QR
│   │   ├── favorites/      # Favoritos
│   │   ├── admin/          # Panel administrador
│   │   ├── provider-panel/ # Panel personal proveedor
│   │   ├── events/         # WebSockets (Pusher)
│   │   └── app.module.ts
│   ├── prisma/schema.prisma # ORM + modelos BD
│   ├── .env
│   └── package.json
├── admin/                   # Next.js (TypeScript + Tailwind)
│   ├── app/
│   │   ├── page.tsx        # Dashboard con 8 métricas
│   │   ├── providers/      # CRUD proveedores
│   │   ├── reviews/        # Moderación reseñas
│   │   └── layout.tsx
│   ├── components/
│   └── lib/api.ts
├── docker-compose.yml       # PostgreSQL 16 + PostGIS, Redis 7.2, MinIO
├── ESTADO_ACTUAL.md
├── OBSERVACIONES_PRIORIZADAS.md
└── CLAUDE.md (este archivo)
```

---

## 🚀 Comandos Esenciales (con RTK)

### Infraestructura
```bash
rtk docker-compose up -d          # Levanta BD, cache, storage
rtk docker-compose down            # Detiene servicios
```

### Backend (Puerto 3000)
```bash
cd backend
rtk npm run start:dev              # Inicia servidor desarrollo
rtk npm run prisma:studio          # Abre UI para explorar BD
```

### Admin Panel (Puerto 3001)
```bash
cd admin
rtk npm run dev                    # Inicia Next.js development
```

### Mobile (Chrome development)
```bash
cd mobile
rtk flutter run -d chrome          # Inicia en Chrome (rápido)
```

### Git
```bash
rtk git status                     # Ver cambios (compacto)
rtk git diff                       # Ver diferencias (optimizado)
rtk git log --oneline              # Ver commits recientes
```

---

## 🏗️ Stack Tecnológico

| Componente | Tech | Versión | Puerto |
|-----------|------|---------|--------|
| Mobile | Flutter | 3.41.6 | — |
| Backend | NestJS | 11.x | 3000 |
| Admin | Next.js | 15 | 3001 |
| Database | PostgreSQL | 16+PostGIS | 5432 |
| Cache | Redis | 7.2 | 6379 |
| Storage | MinIO | S3-compatible | 9000 |

---

## 🔑 Reglas de Desarrollo

### TypeScript Backend (ESM - IMPORTANTE)
```typescript
// ✅ CORRECTO: Incluir extensión .js en imports locales
import { UserService } from './user.service.js';

// ❌ INCORRECTO
import { UserService } from './user.service';
```

### Flutter Feature-First
```
features/
├── auth/
│   ├── data/           # Repository, API calls
│   ├── domain/         # Models, entities
│   └── presentation/   # Screens, widgets, providers
```

### Tailwind CSS v3 (NO v4)
```
✅ postcss.config.mjs: tailwindcss: {}
❌ postcss.config.mjs: @tailwindcss/postcss (v4 syntax)
```

---

## 🐛 8 Críticos a Resolver

**Lee `./OBSERVACIONES_PRIORIZADAS.md` para detalles.**

### TIER 1: BLOQUEA UX (Arreglar primero)
1. Manejo de fotos — desaparecen al cambiar de cuenta
2. Reseñas error — ValidationException + desincronización
3. Categoría selector — no se puede seleccionar

### TIER 2: COMPLETA UX
4. Lógica de roles — botones no responden
5. Detalles proveedor — falta información
6. Botón cliente — Modal incompleto
7. Auto-completa servicios — Formulario vacío

### TIER 3: NUEVAS FUNCIONALIDADES
8. Sistema notificaciones — Bandeja + WebSockets

---

## 💡 Prompts Recomendados

```
# Al empezar sesión
"Leo ESTADO_ACTUAL.md y OBSERVACIONES_PRIORIZADAS.md.
¿Cuál es el crítico #1 que arreglamos hoy?"

# Para arreglar un bug
"Necesito arreglar crítico #1: fotos desaparecen al cambiar cuentas.
Frontend: mobile/lib/features/auth/.../profile_screen.dart
¿Cuál es la causa? ¿Cómo lo arreglamos?"

# Para implementar feature
"Voy a implementar [feature].
¿Qué archivos en frontend/backend/admin necesito tocar?"
```

---

## 📊 RTK — Ahorrador Automático de Tokens

RTK **automáticamente** filtra output innecesario sin que hagas nada especial. Ahorras 60-90% de tokens en comandos comunes.

**Comandos OficioApp prioritarios**:
```bash
rtk npm run start:dev              # Backend (80% ahorro)
rtk npm run dev                    # Admin (80% ahorro)
rtk flutter run -d chrome          # Mobile (75% ahorro)
rtk git status                     # Git (70% ahorro)
rtk git diff                       # Git diffs (80% ahorro)
rtk docker-compose up -d           # Infra (85% ahorro)
```

---

## 🎯 Cómo Empezar Hoy

1. Lee `./ESTADO_ACTUAL.md` (5 min)
2. Lee `./OBSERVACIONES_PRIORIZADAS.md` (10 min)
3. Identifica crítico #1
4. Pregunta: "¿Por qué desaparecen las fotos al cambiar de cuenta?"

---

<!-- rtk-instructions v2 -->
## RTK (Rust Token Killer) — Optimización Automática

**Golden Rule**: Prefija `rtk` a comandos (incluso en chains con `&&`):
```bash
rtk git add . && rtk git commit -m "msg" && rtk git push
```

RTK filtra automáticamente. Resultado: 60-90% menos tokens, sin esfuerzo extra.

**Meta commands**:
```bash
rtk gain                           # Ver tokens ahorrados esta sesión
rtk gain --history                 # Ver historial detallado
```
<!-- /rtk-instructions -->
