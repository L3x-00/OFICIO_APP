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
- **Root Cause**: Trace callers and fix shared cause, not one reported symptom.
- **Trust Boundaries**: Never simplify validation, security, accessibility, or data safety.
- **Regression**: Non-trivial logic leaves one smallest runnable check.

---
## Contexto Estructural con Graphify
Antes de modificar archivos críticos o para entender dependencias entre backend, mobile, web y admin, consulta el grafo en `graphify-out/`. Utiliza el comando `graphify query` o lee `graphify-out/GRAPH_REPORT.md` para evitar leer archivos uno por uno y ahorrar tokens.
⚠️ Verifica su frescura en CONTEXTO_PROYECTO §10 — si figura desactualizado, no confiar en él para módulos nuevos (ej. coverage).
Si `servi-preflight` marca Graphify `STALE`, no regenerarlo sobre árbol sucio:
usar solo contexto canónico + `rg`; regenerar tras PR/merge o árbol limpio.

---
## ⭐ Contexto del sistema (auto-cargado — LEER PRIMERO)

El contexto completo y actual del proyecto (apps, stack, módulos, convenciones,
BD, flujo de trabajo, features, estado) vive en un único doc portable. Codex
debe leerlo al iniciar; Claude lo importa automáticamente:

@docs/CONTEXTO_PROYECTO.md

Es la fuente de verdad. No hace falta explorar el repo archivo por archivo:
ese doc ya resume todo. Mantenerlo actualizado al cerrar cada tanda de cambios.
Para pegar el contexto en otro chat, copia `docs/CONTEXTO_PROYECTO.md`.
Para reactivar funciones ocultas, usar
`docs/REACTIVACION_FUNCIONALIDADES_OCULTAS.md`; no revertir PRs completos.

---
# Servi — Guía de Desarrollo Optimizado

**RTK**: usar solo si `Get-Command rtk`/`command -v rtk` lo encuentra; si falta,
ejecutar el comando directo sin reintentar.
**Node**: objetivo local/CI = 20 (`.nvmrc`). Si `servi-preflight` reporta Node
24 u otra version, cambiar a Node 20 antes de `npm ci`, `npm install` o builds.
**Estado**: producción — ver `@docs/CONTEXTO_PROYECTO.md` §10 para el estado vivo.
**Cambios**: preflight + plan primero; no editar código sin aprobación de fase.
**Árbol local**: preservar cambios existentes. No tocar `mobile/` inconcluso sin
briefing explícito.
**Skills del proyecto** (`.agents/skills/`, auto-cargados): `/servi-preflight` · `/verificar` · `/subir-pr` · `/sql-prod` · `/ui-tema` · `/cerrar-tanda` — usar estos flujos en vez de re-derivarlos.
Los code blocks DENTRO de los skills se ejecutan tal cual (sin prefijo `rtk`) — son la receta exacta validada; la regla RTK aplica al resto de comandos.
Skills genéricos Supabase nunca sustituyen `/sql-prod`: prod = SQL manual por el
usuario, sin `execute_sql`, `migrate deploy`, `db push` ni `--force-reset`.

---

## 📁 Estructura y módulos

4 apps: `mobile/` (Flutter), `backend/` (NestJS ESM), `admin/` + `web/` (Next.js 16).
Lista completa de módulos backend y features móvil en `@docs/CONTEXTO_PROYECTO.md` §3.

---

## 🚀 Comandos Esenciales (RTK si está disponible)

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

### Web pública (Puerto 3002 — build dentro del check Admin + verificación local)
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

Cuando está disponible, RTK filtra output innecesario. Ahorro estimado: 60-90% en comandos comunes.

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

**Golden Rule**: si RTK existe, prefijarlo a comandos (incluso en chains con `&&`):
```bash
rtk git add . && rtk git commit -m "msg" && rtk git push
```

RTK filtra automáticamente. Resultado: 60-90% menos tokens, sin esfuerzo extra.
Si no existe en PATH, usar el comando original; `/servi-preflight` lo detecta.

**Meta commands**:
```bash
rtk gain                           # Ver tokens ahorrados esta sesión
rtk gain --history                 # Ver historial detallado
```
<!-- /rtk-instructions -->
