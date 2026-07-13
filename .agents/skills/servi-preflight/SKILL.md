---
name: servi-preflight
description: >-
  Preflight seguro y compacto del monorepo Servi: carga contexto canónico y
  detecta rama, cambios, apps afectadas, gate SQL, frescura de Graphify,
  memoria, skills y herramientas. Usar cuando el usuario diga "antes de
  trabajar", "carga todo el contexto", "ponte al día", "revisa el estado" o
  al retomar una sesión compactada.
---

# Preflight de Servi

## 1. Ejecutar diagnóstico

Desde la raíz del repo:

```powershell
node .agents/skills/servi-preflight/scripts/preflight.mjs
```

Usar `--json` solo cuando otro proceso necesite `changedFiles` completos:

```powershell
node .agents/skills/servi-preflight/scripts/preflight.mjs --json
```

No editar ni limpiar nada durante este paso. Preservar cambios ajenos.

## 2. Cargar contexto

1. Leer completo `docs/CONTEXTO_PROYECTO.md`. Fuente de verdad.
2. Si Graphify sale `FRESH`, consultar `graphify query` antes de tocar módulos
   críticos. Si sale `STALE`, no usarlo para código posterior al commit mostrado.
   `FRESH` compara la base del grafo con cambios commiteados de fuente en las
   cinco apps. Commits solo de docs, tooling, CI o `graphify-out/` no lo
   invalidan; el árbol local sin commit siempre se revisa por separado.
3. Leer solo el skill aplicable:
   - BD/Supabase/schema → `sql-prod` primero; sus reglas Servi prevalecen sobre
     el skill genérico `supabase`.
   - Flutter visual → `ui-tema`.
   - Tests/checks → `verificar`.
   - Git/PR/merge → `subir-pr`.
   - Cierre/memoria → `cerrar-tanda`.
4. Leer memoria persistente solo si contiene una decisión no derivable del repo.

## 3. Aplicar riesgos

- Árbol sucio → separar archivos del usuario; stage selectivo.
- `SQL_GATE` → no mergear hasta confirmación manual del usuario.
- `STALE` → no regenerar Graphify sobre trabajo incompleto; hacerlo tras merge o
  desde árbol limpio.
- RTK ausente → ejecutar comando directo una vez; no reintentar con RTK.
- Node distinto de `.nvmrc`/CI → usar Node 20 antes de instalar dependencias,
  construir o correr checks Node; si solo es diagnóstico, reportar.
- Skills faltantes o Claude más nuevo → revisar flujo equivalente antes de usarlo.
- Artefactos sospechosos → reportar; no borrar sin autorización.

## 4. Reportar

Dar solo resumen: contexto/grafo, rama/dirty, apps, SQL gate, riesgos. No pegar
listas largas salvo solicitud.
