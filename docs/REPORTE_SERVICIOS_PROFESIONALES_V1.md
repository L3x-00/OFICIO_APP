# Reporte final — Servicios Profesionales V1

**Fecha:** 2026-07-30
**Rama:** `feat/profesionales-v1` (sin push)
**Autores:** OpenAI Codex (fases 0-2, se quedó sin tokens a mitad de fase 3) +
Claude Code (auditoría, fase 3, fase 4, revisión y corrección de todo el trabajo)

## Resumen

Se retomó el trabajo donde Codex lo dejó (fase 3 a medias, sin commit) y se
completaron las fases 3 y 4 del plan (`docs/PLAN_SERVICIOS_PROFESIONALES_V1.md`).
El sistema ahora soporta un tercer tipo de proveedor `PROFESIONAL` (servicios
con formación/especialidad) además de `OFICIO` (oficios manuales) y `NEGOCIO`,
en backend, móvil, web, admin y el asistente Ofi. Regla dura verificada en
todas las capas: un usuario puede tener Cliente + (Oficio **o** Profesional,
nunca ambos) + Negocio opcional.

**No se tocó Supabase ni se ejecutó SQL contra producción.** No hubo push.

## Commits locales (6, en orden)

| Commit | Fase | Contenido |
|---|---|---|
| `1c3cc74` | 0 | Contrato, matriz de categorías, SQL de auditoría de solo lectura |
| `f54432c` | 1 | `schema.prisma`, compatibilidad de pagos, guardrails de tipo/categoría |
| `96c73ef` | 2 | Backend de migración Oficio→Profesional, admin categorías/trust |
| `b3a8ff5` | fix | Mocks de `coverage.service.spec.ts` desalineados tras el cambio de fase 1 |
| `0dc3672` | 3 | UX móvil + web + admin para los 3 tipos |
| `edfeea8` | 4 | Ofi (KB + labels) reconoce Profesional |

## Qué se hizo en esta tanda (fase 3 y 4, más limpieza)

### Fix de regresión heredada (antes de tocar nada nuevo)
`coverage.service.ts` cambió en fase 1 (de `findFirst` a `findMany`, para
detectar OFICIO+PROFESIONAL simultáneos), pero su test seguía mockeando
`findFirst` — 9 tests fallaban. Corregido y verificado (17/17 en esa suite).

### Móvil (Flutter)
- `core/utils/provider_type.dart`: enum canónico de 3 vías con alias legacy
  (`PROFESSIONAL→OFICIO`, `BUSINESS→NEGOCIO`).
- Registro: `onboarding_screen`, `join_us_*` y `provider_onboarding_form` ya
  ofrecen "Profesional"/"Especialista" como tercera opción, con especialidad
  obligatoria y 5 campos opcionales (institución, años de experiencia,
  título, colegiatura, entidad emisora).
- Pantalla nueva `professional_migration_screen.dart`: flujo completo de
  migración Oficio→Profesional (formulario prellenado, estado
  pendiente/rechazado/reintentar, hasta 4 documentos de credenciales).
- `profile_screen.dart`: bloque "Servicio profesional" en Mis Perfiles, CTA
  de migración desde un Oficio aprobado, y entrada de registro directo para
  quien todavía no tiene perfil individual.
- **7 bugs de exclusión mutua corregidos** (todos comprobados con casos reales
  de un usuario Profesional+Negocio, que antes de este fix caían en ramas
  pensadas solo para OFICIO+NEGOCIO):
  1. `provider_panel.dart` — el switcher entre paneles (`_canSwitch = hasOficio && hasNegocio`)
     nunca aparecía para Profesional+Negocio; ahora usa el tipo individual real.
  2. `ai_assistant_fab.dart` — un Profesional se trataba como "cliente puro" y
     podía ocultar el FAB de Ofi que un proveedor siempre debe ver.
  3. `profile_screen.dart` — el toggle de visibilidad de Ofi en Preferencias
     tenía el mismo problema.
  4. `panel_home_tab.dart` — `hasBothProfiles` (gate del paso de tutorial del
     switcher) no contaba Profesional+Negocio.
  5. `settings_dialogs.dart` y `panel_settings_tab.dart` — el aviso al borrar
     un perfil ("tu otro perfil se mantiene" vs "pasas a ser cliente") daba el
     mensaje equivocado para esa combinación.
  6. `profile_badges.dart` — badge de tipo de cuenta y color de aprobación no
     reconocían Profesional.
  7. `profile_helpers.dart` — el label de tipo de cuenta omitía "Servicio
     profesional" en la combinación.
- Verificado con `flutter analyze` completo: **0 issues nuevos** (los 15
  reportados son preexistentes y ajenos, confirmado archivo por archivo).

### Web (Next.js)
- `provider-onboarding-form.tsx`: tercer `TypeCard`, campos profesionales,
  payload condicionado por tipo.
- `[slug]/page.tsx` (perfil público): usa el tipo real de 3 vías, muestra
  especialidad/institución/años de experiencia y el badge "Credenciales
  verificadas" solo cuando el admin aprobó documentos.
- `lib/api.ts`: `getMyProviderStatus`/`getAnalytics` dejaron de ser binarios;
  se agregaron `submitProfessionalMigration`/`getMyProfessionalMigration`
  (estaban tipadas pero nunca implementadas). Se amplió también
  `onboarding-plans-modal.tsx`/`yape-payment-modal.tsx` porque el backend de
  pagos ya aceptaba los 3 tipos y el tipo TS binario bloqueaba compilar el
  flujo de planes para un Profesional recién registrado.
- Verificado: `tsc --noEmit` limpio, `npm run build` de producción OK.

### Admin (Next.js)
- **Bug real encontrado y corregido:** `create-provider-modal.tsx` tenía el
  estado y el `handleSubmit` completamente cableados para `PROFESIONAL` (6
  campos, validación de especialidad), pero el selector de tipo en pantalla
  solo renderizaba 2 botones (Oficio/Negocio) — un admin **nunca pudo crear
  un proveedor Profesional** desde ese modal, y además el archivo no
  compilaba (`<User />` sin importar). Se completó el selector de 3 vías y
  la sección de campos profesionales que faltaba por completo.
- `admin/app/professional-migrations/` (nuevo): cola de solicitudes
  (lista + detalle) que consume los endpoints ya listos desde fase 2 —
  aprobar/rechazar, comparar categorías previas vs. solicitadas, ver
  documentos adjuntos.
- `providers-list.tsx` / `trust-validation/*`: corregido el label
  "Profesional" que antes usaba OFICIO (heredado de cuando solo existían 2
  tipos) y que ahora colisionaba visualmente con el tipo real `PROFESIONAL`.
- `categories/page.tsx`: tercera sección para categorías `forType=PROFESIONAL`.
- Se limpiaron 7 `any` explícitos preexistentes (`catch (e: any)`, `variant: any`)
  en archivos tocados — bloqueaban el hook de pre-commit aunque no eran parte
  de este cambio; se corrigieron con el mismo patrón ya usado en el resto del
  código (`e instanceof Error`, tipo `BadgeVariant` exportado).
- Verificado: `tsc --noEmit` limpio, `vitest run` 26/26.

### Ofi (backend/src/ai-assistant)
- `ai-knowledge.seeder.ts`: los topics `que_es_servi` y `tipos_de_perfil`
  describían solo Oficio/Negocio; ahora describen los 3 tipos y la regla de
  exclusión, y aclaran que el sello de credenciales es opcional (no todo
  Profesional está certificado).
- `provider.strategy.ts`: el prompt de sistema mostraba el literal
  `"PROFESIONAL"` en vez de reusar el helper de labels ya existente
  (`"Servicio profesional"`).
- `ai-data-access.service.ts`: comentario/tipo desactualizado corregido (el
  fallback de suscripción ya cubría los 3 tipos, solo estaba mal documentado).
- Verificado: `tsc --noEmit` limpio, `jest test/unit/ai-assistant` 95/95.

## Verificación consolidada

| Área | Resultado |
|---|---|
| Backend `npm test` | **72 suites / 626 tests** ✅ |
| Backend `tsc --noEmit` | limpio ✅ |
| Admin `vitest run` | **10 archivos / 26 tests** ✅ |
| Admin `tsc --noEmit` | limpio ✅ |
| Web `npm run build` (producción) | OK ✅ |
| Mobile `flutter analyze` (proyecto completo) | 0 issues nuevos (15 preexistentes ajenos) ✅ |

## SQL pendiente de aplicación manual (Supabase, en este orden)

Ninguno se ejecutó. El usuario debe correrlos manualmente, en orden, y
confirmar el resultado antes de mergear:

1. `backend/prisma/sql/profesionales_01_provider_type.sql` — agrega
   `PROFESIONAL` al enum `ProviderType`.
2. `backend/prisma/sql/profesionales_02_perfiles_y_migraciones.sql` — tablas
   `ProfessionalProfile`/`ProfessionalMigrationRequest` + índice parcial XOR.
3. `backend/prisma/sql/profesionales_03_auditar_referencias_mercadopago.sql`
   — solo lectura, auditoría previa.
4. `backend/prisma/sql/profesionales_04_pago_mercadopago.sql` — compatibilidad
   de referencias de pago con el nuevo tipo.
5. `backend/prisma/sql/profesionales_05_catalogo_inicial.sql` — catálogo
   inicial de categorías profesionales (solo `INSERT`, slugs reservados
   `pro-*`, idempotente).

(`backend/prisma/sql/auditar_servicios_profesionales.sql` de fase 0 es
independiente, solo lectura, y ya se corrió en local — el usuario debe
correrla también contra Supabase antes de clasificar categorías reales.)

## Pendiente después del SQL

- Revisión del propietario del diff completo (6 commits) y aprobación.
- Push de la rama, PR vía `gh api` REST, esperar CI (Backend/Mobile/Admin),
  gate SQL, squash-merge (skill `/subir-pr`).
- `docs/CONTEXTO_PROYECTO.md` §7/§10 y memoria: actualizar tras el merge
  (skill `/cerrar-tanda`), no antes — para no documentar algo que aún no
  está en `main`.

## Deuda menor, no bloqueante (documentada, no corregida)

- **Label inconsistente entre apps:** móvil usa "Especialista" en
  `onboarding_screen.dart`/`join_us_*` (para no repetir la palabra
  "Profesional" que Oficio ya usa en esas dos pantallas puntuales) mientras
  que web/admin/Ofi usan "Servicio profesional"/"Profesional". Es una
  decisión deliberada documentada en el propio código (evita que dos tipos
  distintos digan lo mismo en la misma pantalla), pero sería bueno unificar
  el copy en una pasada de pulido de UX, no de lógica.
- **Enum Prisma generado local desactualizado:** `backend/src/generated/client/enums.ts`
  no tiene `PROFESIONAL` todavía (el código evita depender de él, usa
  `string`/`as any` a propósito) — CI corre `prisma generate` antes de
  build, así que no bloquea, pero un `npx prisma generate` local lo
  resolvería para quien siga trabajando en esta rama.
- **`ProviderPanel`** (móvil) internamente trata cualquier tipo distinto de
  NEGOCIO como "individual" para el contenido de tabs (Servicios vs
  Productos) — correcto y sin cambios; el switcher de arriba ya distingue
  los 3 tipos, pero si en el futuro se agregan textos específicos por tipo
  dentro de esos tabs, no asumir binario ahí tampoco.
- ESLint global de `admin/` conserva deuda histórica documentada en
  `docs/CONTEXTO_PROYECTO.md` (CI la trata como informativa); solo se
  corrigió la deuda en archivos que este cambio ya tocaba.
