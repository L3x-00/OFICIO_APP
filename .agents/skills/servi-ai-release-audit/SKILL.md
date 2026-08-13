---
name: servi-ai-release-audit
description: Audita Ofi y WhatsApp antes de publicar o activar. Usar al cambiar ai-assistant, whatsapp-assistant, OpenWA, servi.md, flags o conocimiento público de Servi.
---

# Auditoría IA Servi

Auditoría reproducible previa a publicar o activar Ofi/WhatsApp. Protege el
comportamiento existente, privacidad, alcance Servi y defaults apagados.

## Secuencia obligatoria

1. Ejecutar `npm run preflight`. Leer `docs/CONTEXTO_PROYECTO.md`; consultar
   Graphify solo si está `FRESH`. Con árbol sucio, usar contexto + `rg` y no
   regenerar Graphify.
2. Confirmar rama aislada, diff selectivo y Node 20. Nunca tocar `mobile/`
   inconcluso ni aplicar SQL de producción automáticamente.
3. Auditar frontera OpenWA ↔ Servi: HMAC sobre cuerpo crudo, sesión exacta,
   `message.received`, `fromMe=false`, chat individual, deduplicación y
   at-most-once. Verificar que master/F2/F3/F4 siguen en `false` por default.
4. Auditar Ofi: allowlist pública, sin JWT administrativo, sin herramientas de
   pagos/perfil/escritura, sanitización antes de consumir cuota y límites de
   tamaño para conocimiento dinámico.
5. Si existe `servi.md`, tratarlo como fuente humana no confiable. No inyectar
   texto crudo en prompts ni BD. Extraer solo datos confirmados por código y
   documentación canónica; validar enlaces contra fuentes internas. No prometer
   iOS, cobertura futura, funciones ocultas, precios o verificación no
   confirmados.
6. Ejecutar el validador estático:

```powershell
npm run ai:audit
```

7. Ejecutar verificación proporcional bajo Node 20: typecheck Prisma generado,
   suites WhatsApp/Ofi, lint focalizado y luego checks backend, admin, web y
   móvil según `/verificar`. Registrar bloqueos reales: no sustituirlos por
   afirmaciones de éxito.
8. Para revisión independiente solicitada, ejecutar Claude Code de forma
   read-only con `--model opus --permission-mode plan`. Guardar resultado y
   contrastarlo con código; no aplicar propuestas que contradigan fuentes
   canónicas o amplíen alcance.
9. Documentar hallazgos, correcciones, pruebas y límites de activación. No
   activar flags ni enviar tráfico real sin autorización expresa.
10. Publicar con `/subir-pr`: stage selectivo, Conventional Commit, CI, squash
    merge y sync de `main`. Solo tras árbol limpio regenerar Graphify y cerrar
    con `/cerrar-tanda`.

## Criterios de salida

- F1 permanece útil sin F2/F3/F4.
- STOP y HUMANO prevalecen sobre FAQ, IA y vínculo.
- Una entrada fuera de Servi nunca llega a Ofi.
- Contenido de marca determinista no es sobrescrito por IA.
- Ningún cambio exige SQL sin SQL manual aplicado por el usuario.
- Reporte separa pruebas ejecutadas, bloqueos y smoke real pendiente.

## Recurso

- `scripts/verify-ai-safety.mjs`: guardas estáticas rápidas. No reemplaza
  pruebas, revisión de código ni smoke autorizado.
