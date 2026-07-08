---
name: subir-pr
description: >-
  Flujo git completo de Servi: rama nueva → stage selectivo → commit → push →
  PR (gh api REST) → poll CI (3 checks) → gate SQL → squash-merge → sync main.
  Usar cuando el usuario diga "sube esto", "haz el PR", "mergea", "subir a
  github", o al terminar un cambio importante listo para main.
---

# Subir cambio: rama → PR → CI → merge

Branch Protection ACTIVA en main — cambios importantes SIEMPRE por PR.
Solo triviales (typo docs) pueden ir directo. Repo: `L3x-00/OFICIO_APP`.

## 0. Precondición

Correr `/verificar` primero si no se hizo. No subir con checks rojos.

## 1. Rama

```bash
git branch --show-current                          # si ya estás en rama de trabajo, úsala
git fetch origin && git checkout -B <tipo>/<slug> origin/main   # fix/ | feat/ | docs/
```
`-B ... origin/main` cubre dos fallos a la vez: rama desde main local viejo
(el PR mostraría reversiones de trabajo ajeno — nos pasó: 37 archivos de web/)
y rama que ya existía de un intento abortado. ⚠️ `-B` RESETEA la rama: si la
existente tenía commits que conservar, usa otro slug.

## 2. Stage selectivo (NUNCA `git add .`)

Stagear SOLO los archivos del cambio, por ruta explícita. Prohibido stagear:
`.claude/settings*`, `coverage/`, `mobile/android/build/`,
`backend/src/generated/`, `*.lock` de scheduled tasks, `Untitled-*`,
`problems-report.html`. Verificar con `git diff --cached --stat`.

## 3. Commit

Pre-commit hook (husky + lint-staged) corre eslint/prettier/dart format.
- Hook PASA y reescribió archivos → nada que hacer, lint-staged ya re-stageó.
- Hook FALLA → el commit se aborta con el árbol modificado: arreglar la causa,
  `git add <los MISMOS paths del §2>` (nunca `git add -u` global — arrastra
  basura), repetir el mismo `git commit`. Prohibido `-n`.

Mensaje: qué + por qué, en español, con trailer:
`Co-Authored-By: Claude <noreply@anthropic.com>`.

## 4. Push + PR (gh: qué funciona y qué no)

El token NO tiene `read:org` → `gh pr create/edit/merge` FALLAN (GraphQL pide
campos de org). SÍ funcionan: `gh api ...` (REST) y `gh pr checks`.

⚠️ **Cada invocación del Bash tool es un shell NUEVO** — re-exportar SIEMPRE
este preámbulo en cada llamada que use gh:

```bash
export GH_TOKEN=$(printf 'protocol=https\nhost=github.com\n\n' | git credential fill 2>/dev/null | sed -n 's/^password=//p')
GH="/c/Program Files/GitHub CLI/gh.exe"
```

```bash
git push -u origin <rama>
"$GH" api -X POST repos/L3x-00/OFICIO_APP/pulls -f title="..." -f head="<rama>" -f base="main" -f body="..."
```
Body del PR: resumen de cambios + verificación + `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

## 5. Poll CI (3 checks: Backend / Mobile / Admin)

```bash
"$GH" pr checks <N>    # loop cada 30s; Backend ~3-4min, Mobile ~2, Admin ~1
```
- El Bash tool corta a los 2 min — loops cortos (3-4 polls) y repetir la
  llamada, no un solo loop largo.
- Fallback REST si `pr checks` fallara:
  `"$GH" api repos/L3x-00/OFICIO_APP/commits/$(git rev-parse HEAD)/check-runs --jq '.check_runs[] | .name+": "+.status+"/"+(.conclusion//"-")'`
- ⚠️ **web/ NO tiene check en CI** — su única verificación es `/verificar`
  local (`npm run build`). No mergear cambios de web/ sin haberla corrido.
- Check ROJO → ver el fallo por REST:
  `"$GH" api "repos/L3x-00/OFICIO_APP/actions/runs?head_sha=$(git rev-parse HEAD)" --jq '.workflow_runs[0].id'`
  → `"$GH" api repos/L3x-00/OFICIO_APP/actions/runs/<id>/jobs --jq '.jobs[] | select(.conclusion=="failure") | .name, .html_url'`
  Arreglar, commit+push a la MISMA rama (mismo PR), re-poll.

## 6. GATE SQL — bloqueo duro

Si el diff toca `backend/prisma/schema.prisma` o agrega `backend/prisma/sql/*.sql`:
**NO MERGEAR**. Entregar el SQL al usuario (idempotente, ruta + contenido) y
esperar su confirmación explícita ("aplicado" / "ya corrió") — él lo ejecuta
manualmente en Supabase. Recién entonces mergear. Sin SQL → merge directo con
CI verde.

## 7. Merge + limpieza

```bash
"$GH" api -X PUT repos/L3x-00/OFICIO_APP/pulls/<N>/merge -f merge_method=squash
```
- Merge devuelve **405/409** ("not mergeable": conflictos o rama behind con
  checks estrictos — típico si main avanzó mientras esperaba el gate SQL) →
  en la rama: `git fetch origin && git merge origin/main` (resolver
  conflictos), push, re-poll CI (§5), reintentar el merge.

Sync de main — stash SOLO si hay algo que stashear (un `stash pop` a ciegas
sobre árbol limpio revienta un stash AJENO que ya existe en este repo):

```bash
if [ -n "$(git status --porcelain)" ]; then git stash push -u -m pre-merge-sync; STASHED=1; fi
git checkout main && git pull origin main && git branch -D <rama>
[ "$STASHED" = "1" ] && git stash pop
git log --oneline -2   # confirmar el squash en main
```
Si `stash pop` conflictúa: resolver a mano y `git stash drop` — nunca repetir
`pop` a ciegas.

## 8. Cierre

Reportar: PR #N merged (sha), checks, y si aplica recordar: backend →
auto-deploy en Render; móvil → llega a usuarios al recompilar el .aab.
Si fue una tanda importante → correr `/cerrar-tanda`.
