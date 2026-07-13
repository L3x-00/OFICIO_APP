---
name: subir-pr
description: >-
  Flujo git completo de Servi: rama nueva, stage selectivo, commit, push, PR
  REST, CI, gate SQL, squash-merge y sync main. Usar cuando el usuario diga
  "sube esto", "haz el PR", "mergea" o el cambio esté listo para main.
---

# Subir cambio: rama → PR → CI → merge

Branch Protection activa. Cambio importante siempre por PR. Repo:
`L3x-00/OFICIO_APP`.

## 0. Precondición

Ejecutar `/verificar`. No subir checks rojos. Revisar `git status --short` y
separar cambios ajenos.

## 1. Rama segura

Si ya existe rama de trabajo, conservarla. Si está en `main`:

```powershell
git fetch origin
git switch -c <tipo>/<slug> origin/main
```

Con cambios locales, `git switch -c <tipo>/<slug>` primero; no resetear ni usar
`-B`. Si el nombre existe, elegir otro.

## 2. Stage selectivo

Usar `git add <ruta1> <ruta2>`. Nunca `git add .` ni `git add -u` global.
Excluir `.claude/settings*`, `.claude/scheduled_tasks.lock`, coverage, builds,
`backend/src/generated/`, `Untitled-*`, `problems-report.html` y artefactos no
relacionados. Confirmar con `git diff --cached --stat` y
`git diff --cached --name-only`.

## 3. Commit

No saltar hooks con `-n`. Fallo del hook → arreglar, volver a stagear los mismos
paths, repetir. Mensaje español: qué + por qué. Para cambios generados por
Codex usar trailer `Co-Authored-By: OpenAI Codex <noreply@openai.com>`.

## 4. Push y PR por REST

El token actual no tiene `read:org`; evitar comandos GraphQL de `gh`. Preparar
PowerShell en cada llamada sin imprimir token:

```powershell
$credential = "protocol=https`nhost=github.com`n`n" | git credential fill
$passwordLine = $credential | Where-Object { $_ -like 'password=*' }
$env:GH_TOKEN = $passwordLine.Substring(9)
$GH = 'C:\Program Files\GitHub CLI\gh.exe'
git push -u origin <rama>
& $GH api -X POST repos/L3x-00/OFICIO_APP/pulls -f title='<título>' -f head='<rama>' -f base='main' -f body='<resumen + checks>'
```

No persistir ni mostrar `GH_TOKEN`. Body: resumen, verificación, SQL si aplica.

## 5. CI

```powershell
& $GH pr checks <N>
```

Esperar en intervalos cortos. Rojo → inspeccionar run/log, corregir, commit y
push a misma rama, repetir. El check `Admin (Next.js)` también debe cubrir web;
si CI aún no lo hace, `web npm run build` local es obligatorio.

## 6. Gate SQL

Si diff toca `backend/prisma/schema.prisma` o `backend/prisma/sql/*.sql`, no
mergear. Entregar SQL y esperar "aplicado" del usuario.

## 7. Merge y sync

```powershell
& $GH api -X PUT repos/L3x-00/OFICIO_APP/pulls/<N>/merge -f merge_method='squash'
```

405/409 → actualizar rama con `origin/main`, resolver, push y repetir CI.
Después:

```powershell
$stashed = -not [string]::IsNullOrWhiteSpace((git status --porcelain))
if ($stashed) { git stash push -u -m pre-merge-sync }
git switch main
git pull origin main
git branch -D <rama>
if ($stashed) { git stash pop }
git log --oneline -2
```

No hacer `stash pop` si este flujo no creó el stash. Conflicto → resolver una
vez; no repetir pop.

## 8. Cierre

Ejecutar `/cerrar-tanda` si fue importante. Reportar PR, sha, checks, deploy y
pendientes.
