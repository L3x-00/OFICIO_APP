---
name: cerrar-tanda
description: >-
  Cierre de una tanda de cambios en Servi: actualizar el contexto canónico
  (docs/CONTEXTO_PROYECTO.md), la memoria persistente y dar el reporte final.
  Usar tras mergear un PR importante, o cuando el usuario diga "actualiza tu
  memoria", "mantén todo actualizado" o "cierra esto".
---

# Cierre de tanda — mantener todo sincronizado

El contexto se auto-carga en cada chat (CLAUDE.md importa
`@docs/CONTEXTO_PROYECTO.md`). Si no se actualiza al cerrar, el próximo chat
arranca con información vieja. Tres pasos:

## 1. `docs/CONTEXTO_PROYECTO.md` (fuente de verdad)

- **§7 Features en producción**: agregar/ajustar lo mergeado (1-3 líneas por
  feature, con PR#).
- **§10 Estado/pendientes**: mover lo completado, agregar pendientes nuevos
  (SQL sin aplicar, deuda, grafo desactualizado).
- **Fecha** de "Última actualización".
- Si cambió stack/convenciones/módulos → §2-§5 también.
- Es cambio docs-only → puede ir en el mismo PR del feature o en PR docs
  aparte (CI pasa igual; usar `/subir-pr`).

## 2. Memoria persistente (`C:\Users\Usuario\.claude\projects\c--Users-Usuario-oficio-app\memory\`)

- Buscar archivo existente que cubra el tema → ACTUALIZARLO (no duplicar).
  Nuevo solo si es tema nuevo: frontmatter name/description/type
  (user|feedback|project|reference) + cuerpo con el "por qué".
- Actualizar la línea del índice `MEMORY.md` (hook de una línea; nunca
  contenido completo ahí).
- Guardar solo lo NO derivable del repo: decisiones, reglas del usuario,
  gotchas, estado de despliegue/SQL. No guardar lo que ya dice el código o git.

## 3. Reporte final al usuario

Formato: qué se mergeó (PR# + sha) · qué quedó desplegado vs qué falta
(SQL, .aab a Google Play, Render auto-deploy) · pendientes abiertos.
Terso — tabla si son varios ítems.

## Checklist rápido

- [ ] CONTEXTO_PROYECTO.md §7/§10 + fecha (+ conteos de tests en §9 si cambiaron)
- [ ] Memoria: archivo del tema + MEMORY.md índice
- [ ] Docs mergeados a main (no solo locales — la raíz está gitignored,
      lo versionado vive en `docs/`)
- [ ] Reporte con PR#/sha y pendientes
