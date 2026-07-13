---
name: cerrar-tanda
description: >-
  Cierre de una tanda de cambios en Servi: actualizar contexto canónico,
  memoria persistente y reporte final. Usar tras merge importante o cuando el
  usuario diga "actualiza tu memoria", "mantén todo actualizado" o "cierra".
---

# Cerrar tanda

`AGENTS.md` obliga a Codex a leer `docs/CONTEXTO_PROYECTO.md`; no asumir que el
puntero `@docs/...` se expandió automáticamente.

## 1. Contexto canónico

Actualizar solo secciones afectadas:

- §7 features desplegadas, con PR.
- §8 skills/automatización si cambiaron.
- §9 conteos/checks si cambiaron.
- §10 desplegado, pendientes, SQL y frescura Graphify.
- Fecha de última actualización.

Cambios de stack/convención/módulo → actualizar §2–§5.

## 2. Memoria persistente

Codex: `C:\Users\Usuario\.codex\projects\c--Users-Usuario-oficio-app\memory\`.
Claude: `C:\Users\Usuario\.claude\projects\C--Users-Usuario-oficio-app\memory\`.

Actualizar memoria del agente actual. Compartir estado derivable mediante
`docs/CONTEXTO_PROYECTO.md`, no duplicarlo en ambas memorias. Guardar solo
decisiones, reglas del usuario, incidentes y gotchas no obvios. Actualizar
archivo existente; crear uno solo para tema nuevo. `MEMORY.md` contiene hooks
de una línea.

## 3. Reporte

Indicar PR/sha si hubo merge, checks, desplegado y faltante (SQL, Render, `.aab`,
Graphify). Si no hubo merge, decir explícitamente "solo local".

## Checklist

- [ ] Contexto + fecha.
- [ ] Memoria temática + índice.
- [ ] Docs realmente versionados; no confundir punteros de raíz.
- [ ] Reporte con pendientes reales.
