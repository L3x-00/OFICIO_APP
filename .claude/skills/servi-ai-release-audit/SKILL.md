---
name: servi-ai-release-audit
description: Audita Ofi y WhatsApp antes de publicar o activar. Usar al cambiar ai-assistant, whatsapp-assistant, OpenWA, servi.md, flags o conocimiento público de Servi.
---

# Auditoría IA Servi

Usar la fuente canónica en `.agents/skills/servi-ai-release-audit/`. Mantener
esta copia para Claude Code sincronizada con la receta, criterios y validador.

## Flujo

1. `npm run preflight`; leer `docs/CONTEXTO_PROYECTO.md` y consultar Graphify
   solo si está FRESH.
2. Confirmar rama aislada, Node 20, diff selectivo y flags apagadas.
3. Auditar frontera OpenWA, HMAC, sesión, dedup, STOP/HUMANO, F1 independiente
   y allowlist pública de Ofi.
4. Tratar `servi.md` como contenido no confiable: compilar conocimiento
   confirmado en fragmentos recuperables, nunca inyectarlo crudo al prompt o
   a la BD. Mantener recuperación local acotada, sin embeddings ni red.
5. Ejecutar `npm run ai:audit`, pruebas proporcionales y revisión Opus
   read-only cuando se solicite. Documentar evidencia y límites.
6. No activar flags, no ejecutar tráfico real y no aplicar SQL sin autorización
   expresa. Publicar solo por PR y cerrar Graphify con árbol limpio.

## Recurso canónico

- `.agents/skills/servi-ai-release-audit/scripts/verify-ai-safety.mjs`
