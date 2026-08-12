# Auditoría UX/UI + funcional — tanda visual móvil (2026-07-31)

Caché de esta auditoría para poder RETOMAR si se agota la sesión.
Ruta persistente (no se borra al cerrar el chat):
`c:\Users\Usuario\oficio_app\.claude\audit-ux-2026-07-31\`

## Alcance (todo en `mobile/`, nada de backend/web/admin)

Base: `main` @ `4254cdc`. Árbol sucio, sin commitear todavía.

| Bloque | Archivos |
|---|---|
| 1. Carrusel bienvenida 7 slides | `lib/features/auth/presentation/screens/welcome_screen.dart`, `widgets/welcome/*` (nuevos: `slide_welcome_intro`, `slide_types_grid`, `slide_testimonials`, `slide_ofi_assistant`, `stagger_fade`; borrados: `slide_community_visual`, `slide_service_grid`), 7 `.webp` en `assets/images/onboarding/` |
| 2. Nav inferior 3 tabs + campana en AppBar | `lib/core/router/app_shell.dart`, `lib/features/providers_list/presentation/screens/providers_screen.dart` |
| 3. Refactor formulario onboarding + 3 secciones PROFESIONAL | `screens/onboarding/provider_onboarding_form.dart` + 5 widgets nuevos en `screens/onboarding/widgets/` |
| 4. Preferencias unificadas + saludo animado | `screens/profile_screen.dart`, `widgets/profile/profile_sections.dart`, `widgets/profile/profile_toggles.dart`, `providers_list/.../greeting_header.dart` (cambio del usuario) |
| 5. Transversal | `core/constants/app_colors.dart` (+3 acentos), `pubspec.yaml` (build 137→142), tests nuevos |

## Estado

- [x] Inventario del diff — `00-diff-modificados.patch`
- [ ] Auditoría por dimensión (5 agentes) — `10-*.md`
- [ ] Verificación adversarial de hallazgos — `20-veredictos.json`
- [ ] Correcciones aplicadas — `30-correcciones.md`
- [ ] Verificación final (format + analyze + suite)
- [ ] Rama + commits + push + PR

## Orquestación

Workflow `auditoria-ux-movil-tanda-visual`, run `wf_6640442a-4e7`.
Script: `C:\Users\Usuario\.claude\projects\C--Users-Usuario-oficio-app\4475593b-ca5b-45c0-ac8d-9d7778a1a01c\workflows\scripts\auditoria-ux-movil-tanda-visual-wf_6640442a-4e7.js`
Reanudar sin repetir agentes ya completados:
`Workflow({scriptPath: "<ruta de arriba>", resumeFromRunId: "wf_6640442a-4e7"})`
Journal con los retornos reales de cada agente:
`C:\Users\Usuario\.claude\projects\c--Users-Usuario-oficio-app\4475593b-ca5b-45c0-ac8d-9d7778a1a01c\subagents\workflows\wf_6640442a-4e7\journal.jsonl`

5 dimensiones en paralelo (carrusel · navegación · onboarding-form ·
perfil-saludo · transversal), cada hallazgo pasa por un escéptico que intenta
refutarlo leyendo el código real. Cada auditor deja su informe largo en
`10-<dimension>.md`.

## Cómo retomar

1. Leer este archivo y los `10-*.md` / `20-veredictos.json` que ya existan.
2. Continuar desde la primera casilla sin marcar. No re-auditar lo ya escrito.
3. `git status --porcelain -- mobile/` sigue siendo la fuente de verdad del alcance.
4. NUNCA `git add -A`: hay basura ajena (`coverage/`, `backend/src/generated/`,
   `.claude/settings.json`, `mobile/android/build/`). Staging selectivo.
