---
name: verificar
description: >-
  Verificación completa tras un cambio importante en Servi: detecta qué apps
  tocó el diff (backend/mobile/admin/web/my-video) y corre solo sus checks.
  Usar cuando el usuario diga "verifica", "corre los tests", "revisa que todo
  pase" o antes de armar un PR.
---

# Verificación inteligente por diff

Reportar compacto: solo fallos; si pasa, una línea por check.

## 1. Detectar alcance

Ejecutar desde la raíz:

```powershell
$state = node .agents/skills/servi-preflight/scripts/preflight.mjs --json | ConvertFrom-Json
$state.changedFiles
```

Usar la unión rama + árbol sin commitear ya calculada. Clasificar por prefijo:
`backend/`, `mobile/`, `admin/`, `web/`, `my-video/`. Ignorar docs, skills,
coverage, builds y Markdown. Sin cambios de código → terminar.

## 2. Checks por app

**Backend** (`backend/`):

```powershell
npx tsc --noEmit
npx jest <specs-de-módulos-tocados>
```

Suite completa si tocó `common/`, `schema.prisma` o flujo transversal. Campo
Prisma nuevo ausente → regenerar con credenciales ficticias locales; nunca
commitear `backend/src/generated/`.

**Mobile** (`mobile/`):

```powershell
flutter analyze <archivos-tocados>
flutter test
```

Errores/warnings nuevos fallan. Widget con `context.colors` necesita
`theme: AppThemeColors.buildDark()`.

**Admin** (`admin/`):

```powershell
npm run type-check
npm run test
npm run build
```

**Web** (`web/`):

```powershell
npm run build
```

**Videos** (`my-video/`):

```powershell
npm run lint
```

## 3. Corregir y reportar

Fallo → arreglar causa raíz y repetir solo check fallido. Formato:
`✅ backend tsc · ✅ backend jest N/N · ✅ mobile analyze · ✅ mobile test N/N`.
Ante fallo: `archivo:línea`, mensaje exacto, causa. Nunca declarar verificado con
rojo.
