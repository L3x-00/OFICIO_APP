---
name: verificar
description: >-
  Verificación completa tras un cambio importante en Servi: detecta qué apps
  tocó el diff (backend/mobile/admin/web) y corre SOLO sus checks (tsc, jest,
  flutter analyze/test, lint). Usar cuando el usuario diga "verifica",
  "corre los tests", "revisa que todo pase", o antes de armar un PR.
---

# Verificación inteligente por diff

Corre solo lo que el cambio toca. Reporta compacto: **solo fallos** (si todo
pasa, una línea por check). Raíz: `c:/Users/Usuario/oficio_app`.

## 1. Detectar apps afectadas

Conjunto = **UNIÓN** de commits de la rama + árbol sin commitear:

```bash
{ git diff --name-only main...HEAD 2>/dev/null; git status --short | awk '{print $NF}'; } | sort -u
```

Clasificar por prefijo: `backend/` · `mobile/` · `admin/` · `web/`. Ignorar:
`docs/`, `*.md`, `.claude/`, `coverage/`, `mobile/android/build/`. Si la
unión filtrada queda VACÍA → reportar "✅ sin cambios de código, nada que
verificar" y terminar.

## 2. Checks por app (solo las afectadas)

**Backend** (`cd backend`):
```bash
npx tsc --noEmit
npx jest <specs de los módulos tocados>   # dirigido; suite completa si tocó common/ o schema.prisma
```
- Si tsc falla con "property X does not exist" sobre un campo nuevo del schema
  → client Prisma local desactualizado. Regenerar (no conecta a BD):
  `DATABASE_URL="postgresql://u:p@localhost:5432/db" DIRECT_URL="postgresql://u:p@localhost:5432/db" npx prisma generate`
- NUNCA commitear `backend/src/generated/` (CI lo regenera).

**Mobile** (`cd mobile`):
```bash
flutter analyze <archivos tocados>        # rápido, dirigido
flutter test                              # suite completa si tocó lib/ (~30s)
```
- Solo `infos` preexistentes (curly_braces) son aceptables; errors/warnings nuevos NO.
- Widget que lee `context.colors` necesita host de test con
  `theme: AppThemeColors.buildDark()` — sin eso crashea "Null check operator".

**Admin** (`cd admin`): `npm run test` (Vitest). Type-check aparte si tocó TS
(`npx tsc --noEmit`) — `next build` ignora errores de TS.

**Web** (`cd web`): `npm run build`.

## 3. Reporte

Formato: `✅ backend tsc · ✅ backend jest N/N · ✅ mobile analyze · ✅ mobile test N/N`.
Ante fallo: archivo:línea + mensaje exacto + causa probable. NO pegar output
completo — solo las líneas del error.

## Regla

Si un check falla, arreglar la causa raíz y re-correr SOLO ese check. No
declarar "verificado" con checks en rojo ni saltarse apps afectadas.
