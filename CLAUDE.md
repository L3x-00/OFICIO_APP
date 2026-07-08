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
## Contexto Estructural con Graphify
Antes de modificar archivos críticos o para entender dependencias entre backend, mobile, web y admin, consulta el grafo en `graphify-out/`. Utiliza el comando `graphify query` o lee `graphify-out/GRAPH_REPORT.md` para evitar leer archivos uno por uno y ahorrar tokens.
⚠️ Verifica su frescura en CONTEXTO_PROYECTO §10 — si figura desactualizado, no confiar en él para módulos nuevos (ej. coverage).

---
## ⭐ Contexto del sistema (auto-cargado — LEER PRIMERO)

El contexto completo y actual del proyecto (apps, stack, módulos, convenciones,
BD, flujo de trabajo, features, estado) vive en un único doc portable que se
carga automáticamente aquí:

@docs/CONTEXTO_PROYECTO.md

Es la fuente de verdad. No hace falta explorar el repo archivo por archivo:
ese doc ya resume todo. Mantenerlo actualizado al cerrar cada tanda de cambios.
Para pegar el contexto en otro chat, copia `docs/CONTEXTO_PROYECTO.md`.

---
# Servi — Guía de Desarrollo Optimizado

**RTK Habilitado**: Sí (ahorrador de tokens 60-90%)
**Estado**: producción — ver `@docs/CONTEXTO_PROYECTO.md` §10 para el estado vivo.
**Skills del proyecto** (`.claude/skills/`, auto-cargados): `/verificar` · `/subir-pr` · `/sql-prod` · `/ui-tema` · `/cerrar-tanda` — usar estos flujos en vez de re-derivarlos.
Los code blocks DENTRO de los skills se ejecutan tal cual (sin prefijo `rtk`) — son la receta exacta validada; la regla RTK aplica al resto de comandos.

---

## 📁 Estructura y módulos

4 apps: `mobile/` (Flutter), `backend/` (NestJS ESM), `admin/` + `web/` (Next.js 16).
Lista completa de módulos backend y features móvil en `@docs/CONTEXTO_PROYECTO.md` §3.

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

### Web pública (Puerto 3002 — SIN check en CI, verificar local)
```bash
cd web
rtk npm run dev                    # dev
rtk npm run build                  # verificación antes de mergear cambios web/
```

### Git
```bash
rtk git status                     # Ver cambios (compacto)
rtk git diff                       # Ver diferencias (optimizado)
rtk git log --oneline              # Ver commits recientes
```

---

## 🏗️ Stack Tecnológico

Flutter 3.41.6 · NestJS 11 (ESM) :3000 · Next.js 16 admin :3001 / web :3002 ·
Supabase Postgres 16+PostGIS · Upstash Redis · R2/MinIO · Firebase FCM.
Detalle + despliegue en `@docs/CONTEXTO_PROYECTO.md` §2.

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

## 📊 RTK — Ahorrador Automático de Tokens

RTK **automáticamente** filtra output innecesario sin que hagas nada especial. Ahorras 60-90% de tokens en comandos comunes.

**Comandos Servi prioritarios**:
```bash
rtk npm run start:dev              # Backend (80% ahorro)
rtk npm run dev                    # Admin (80% ahorro)
rtk flutter run -d chrome          # Mobile (75% ahorro)
rtk git status                     # Git (70% ahorro)
rtk git diff                       # Git diffs (80% ahorro)
rtk docker-compose up -d           # Infra (85% ahorro)
```

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
