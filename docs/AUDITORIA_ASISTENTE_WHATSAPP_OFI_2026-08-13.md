# Auditoría previa a activación: Ofi y WhatsApp

Fecha: 2026-08-13. Alcance: `backend/src/ai-assistant/`,
`backend/src/whatsapp-assistant/`, contrato OpenWA y regresión de las cuatro
apps. No se activaron flags, no se enviaron mensajes y no se modificó
producción, Supabase ni SQL.

## Decisión de conocimiento

`servi.md` queda versionado como fuente humana de marca. No se inserta crudo
en prompts ni en `ai_knowledge_entries`: puede contener instrucciones, datos
desactualizados o texto no apto para un canal público.

Ofi recibe `servi-platform-knowledge.ts`, un bloque pequeño y curado con datos
confirmados: propósito, cobertura inicial, perfiles, planes generales, límites
de confianza y enlaces oficiales de web y Android. El prompt marca ese bloque
y la KB dinámica como datos, nunca como instrucciones. La KB dinámica queda
limitada a 30 entradas y 12 000 caracteres; cambia de clave de caché al
desplegar para no reutilizar durante cinco minutos un bloque anterior.

## Fronteras verificadas

| Área | Resultado |
| --- | --- |
| OpenWA → Servi | Firma HMAC sobre cuerpo crudo, sesión exacta, `message.received`, `fromMe=false`, chat individual y texto acotado. |
| Entrega | Idempotencia por sesión + HMAC de `messageId`; estado `SEND_STARTED` antes de salida; sin reintento automático. |
| Privacidad | No se persisten teléfono, JID, texto ni `messageId` en claro; contacto e id se convierten a HMAC. |
| Ofi externo | Solo catálogo público y herramientas `search_providers`, `search_categories` y `explain_feature`; sin cuenta, pagos, perfil, referidos, admin ni escritura. |
| Activación | Master, F2, F3 y F4 mantienen default `false`. |
| OpenWA | Endpoint `send-text`, header de firma y payload son compatibles con el contrato actual de OpenWA. |

## Hallazgos corregidos

1. **Carrera de vínculo F3.** Dos OTP simultáneos podían hacer que un segundo
   usuario recibiera confirmación aunque el contacto quedara vinculado al
   primero. El `upsert` ahora devuelve el dueño resultante y solo confirma si
   coincide con el OTP consumido.
2. **F3 apagada no era totalmente inerte.** Un comando `VINCULAR` podía usar
   el texto de error de vínculo aun con F3 desactivada. Ahora no consume código
   ni revela el flujo; conserva la respuesta determinista F1.
3. **Handover demasiado amplio.** La coincidencia parcial de `persona` pausaba
   el bot ante consultas normales. Se reemplazó por patrones de palabra/frase
   completa.
4. **Presupuesto global consumible por entradas bloqueadas.** En la ruta
   pública Ofi se consumía cuota antes de sanitizar. La sanitización ahora es
   anterior al contador.
5. **KB dinámica sin límite.** Se acotó cantidad, caracteres, tema y nul bytes
   para proteger costo y contexto.
6. **Marca podía ser reemplazada por F2.** Saludos y desvíos de funciones no
   disponibles se marcan no elegibles para IA; Ofi solo amplía FAQs públicas
   permitidas.
7. **FAQ y enlaces incompletos.** Se agregaron saludo, descarga, registro,
   cobertura, confianza y URLs oficiales verificadas. Se evita prometer iOS,
   fechas, resultados de proveedores o funciones ocultas.
8. **OTP F3 con índice aleatorio inválido.** El alfabeto evita caracteres
   ambiguos y tiene 31 símbolos, pero el generador lo trataba como 32. Un valor
   aleatorio podía crear un código con `undefined`; ahora usa muestreo sin sesgo
   y garantiza diez caracteres válidos.

## Revisión independiente

Claude Code se ejecutó realmente en modo lectura con `--model opus`, esfuerzo
máximo y permisos `plan`. Su revisión coincidió en saludo, enlaces, tono,
funciones ocultas y guardas de falsos positivos. Las propuestas se contrastaron
contra código y contexto canónico: se conservaron `servi.md`, los defaults
apagados y la separación OpenWA/Servi; no se usó el enlace de Facebook no
canónico ni se introdujo SQL.

## Verificación ejecutada

| Check | Resultado |
| --- | --- |
| `npm run ai:audit` | Verde. Conocimiento curado, flags seguras y guardas presentes. |
| Skill `servi-ai-release-audit` | Validada por `quick_validate.py`. |
| Backend TypeScript | Verde bajo Node 20.20.2 tras `prisma generate` local. Artefactos generados retirados del diff. |
| Backend focalizado | 5 suites, 58 pruebas verdes. |
| Backend completo | 84 suites, 743 pruebas verdes. |
| Admin | `tsc`, 10 archivos / 26 pruebas y build verdes. |
| Web | Build Next.js + TypeScript verde, 18 rutas. |
| Móvil | 238/238 pruebas verdes. `flutter analyze` conserva 14 infos de estilo preexistentes, cero errores. |

Los logs de errores de pagos, red, IA y subastas durante Jest/Flutter son casos
negativos intencionales de sus suites, no fallos de la ejecución.

## Límites pendientes de autorización

- No se activó `WHATSAPP_ASSISTANT_ENABLED` ni F2/F3/F4.
- No se ejecutó smoke con número, webhook real, Render o OpenWA.
- No hay cambios de schema ni SQL pendiente.

Cuando el propietario autorice activación: habilitar F1 primero en staging y
verificar `FAQ → STOP → silencio`, `HUMANO → una confirmación → silencio` y
firma inválida → 401. Habilitar F2, F3 y F4 por separado después de ese smoke.
