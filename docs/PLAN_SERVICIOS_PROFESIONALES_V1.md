# Plan V1 — Oficios, Profesionales y Negocios

**Fecha:** 2026-07-29
**Estado:** investigación y diseño. Sin cambios funcionales, SQL, commit ni push.

## Objetivo aprobado

Separar la oferta de Servi sin perder datos ni romper perfiles existentes:

- **Cliente:** capacidad base de cualquier cuenta; no es un tipo de `Provider`.
- **Oficios** (`OFICIO`): servicios prácticos, por ejemplo gasfitería, carpintería y albañilería.
- **Profesionales** (`PROFESIONAL`): servicios con especialidad, formación o experiencia declarada, por ejemplo ingeniería civil, derecho o contabilidad.
- **Negocios** (`NEGOCIO`): local, empresa o marca.

Regla confirmada: una cuenta puede tener Cliente + **uno** entre Oficio o Profesional + Negocio opcional. Nunca Oficio y Profesional al mismo tiempo.

Los planes actuales Gratis, Estándar y Premium se mantienen. Negocios profesionales (clínicas, estudios, consultoras) quedan fuera de V1.

## Lenguaje público y confianza

| Código interno | Etiqueta pública | Descripción corta |
|---|---|---|
| `OFICIO` | Oficios | Soluciones prácticas para el hogar y trabajo. |
| `PROFESIONAL` | Profesionales | Servicios especializados, con formación o experiencia. |
| `NEGOCIO` | Negocios | Locales, empresas y marcas. |

No usar “servicios básicos”. Reduce injustamente el valor de los oficios.

Un perfil `PROFESIONAL` no mostrará “Credenciales verificadas” por defecto. Ese badge solo aparece cuando Admin revisa y aprueba un documento opcional. Así el formulario se mantiene amable para egresados, independientes y perfiles con experiencia, sin promesas engañosas.

## Hallazgos críticos de la auditoría

1. **Alias legacy ocupado.** `PROFESSIONAL` ya es un alias histórico de `OFICIO` en búsqueda y móvil. No se puede reutilizar. Nuevo valor canónico: `PROFESIONAL` en español. Durante transición se debe leer `PROFESSIONAL -> OFICIO` y `BUSINESS -> NEGOCIO`; API nueva solo emitirá `OFICIO | PROFESIONAL | NEGOCIO`.

2. **Modelo actual binario.** `ProviderType` solo contiene `OFICIO` y `NEGOCIO`, y muchos contratos de backend, móvil, web, Admin, pagos, chat, notificaciones y Ofi están tipados a dos valores.

3. **Invariante de perfiles.** `@@unique([userId, type])` impediría duplicados del mismo tipo, pero permitiría tres perfiles si se agrega `PROFESIONAL`. Se requiere defensa doble: validación de servicio y un índice parcial PostgreSQL que bloquee Oficio + Profesional para el mismo usuario.

4. **Migrar no es crear.** `Provider.id` referencia chats, reseñas, favoritos, suscripción, pagos, imágenes, cobertura, analíticas, recomendaciones, reportes y URL pública. La migración debe actualizar la misma fila `Provider`; crear otro perfil rompería la continuidad.

5. **Aprobación normal no sirve.** `AdminTrustService.approveVerification()` crea plan de cortesía, toca referidos y cambia el rol del usuario. Reutilizarlo para migrar podría duplicar beneficios o ocultar un Oficio aprobado al rechazar. Migración profesional requiere flujo Admin separado.

6. **Categorías sin guardrail suficiente.** El registro actual acepta categorías activas de cualquier tipo y usa fallback global. Con categorías exclusivas, backend debe rechazar una categoría cuyo padre no corresponda al tipo elegido; nunca asignar fallback automático.

7. **Redes ya existen.** Facebook, Instagram, LinkedIn, TikTok, X, web, Telegram y WhatsApp Business ya viven en `Provider` y en el registro. Profesional solo cambia su presentación y validación; no requiere duplicar columnas.

8. **Validación de confianza distinta.** El flujo actual de DNI/RUC acredita identidad/confianza. Credenciales profesionales deben revisarse de forma separada y privada; documentos nunca se exponen en el perfil público.

## Modelo seguro propuesto

### Datos persistentes

Cambios aditivos. No se borran ni mueven proveedores, categorías, imágenes o relaciones existentes.

1. Agregar `PROFESIONAL` al enum `ProviderType`.
2. Agregar `ProfessionalProfile` 1:1 con `Provider` para datos públicos seguros:
   - especialidad;
   - institución;
   - años de experiencia;
   - número de colegiatura/registro;
   - entidad emisora;
   - estado de credenciales.
3. Agregar `ProfessionalMigrationRequest` para Oficios existentes:
   - `providerId` del Oficio actual;
   - borrador de datos profesionales;
   - categorías profesionales solicitadas;
   - documentos privados opcionales;
   - `PENDING | APPROVED | REJECTED`, motivo, revisor y fechas.
4. Reutilizar `VerificationDoc.certificado` o asociar los documentos a la solicitud. Nunca incluir URLs privadas en respuestas públicas.
5. Crear índice parcial: un `userId` no puede tener a la vez `OFICIO` y `PROFESIONAL`; `NEGOCIO` puede coexistir.

### Campos del formulario profesional

| Campo | Regla V1 |
|---|---|
| Especialidad y categoría profesional | Obligatorios. |
| Institución | Opcional, recomendada. |
| Años de experiencia | Opcional. |
| Título/certificado | Opcional, privado. |
| Colegiatura, registro y entidad | Opcionales. |
| Redes, web y portafolio | Opcionales; se reutilizan campos actuales. |

El formulario reutiliza nombre, teléfono, WhatsApp, descripción, ubicación, fotos y redes existentes. Para una migración solo pregunta datos nuevos y categorías profesionales.

## Flujos funcionales

### Registro nuevo como Profesional

1. Usuario elige Cliente, Oficios, Profesionales o Negocios.
2. Al elegir Profesional, ve el mismo patrón visual del onboarding actual y categorías filtradas por `PROFESIONAL`.
3. Completa datos base, especialidad y fotos; credenciales son opcionales.
4. Se crea `Provider` con tipo `PROFESIONAL` en revisión normal.
5. Admin aprueba el perfil. Felicitación y notificación usan copy profesional.
6. Si adjuntó credenciales y Admin las revisa, se activa el badge de credenciales verificadas.

### Migración Oficio → Profesional

1. CTA solo disponible para un Oficio aprobado.
2. Sheet explica: “Tu perfil seguirá visible como Oficio mientras revisamos la solicitud”.
3. Formulario prellenado; solicita especialidad y nuevas categorías profesionales.
4. Se crea solicitud separada. El `Provider.type` sigue siendo `OFICIO`; plan, rol, visibilidad y reputación no cambian.
5. Admin revisa una cola exclusiva de migraciones.
6. Al aprobar, una sola transacción actualiza la **misma** fila: tipo a `PROFESIONAL`, perfil complementario y categorías elegidas. Conserva `Provider.id`, slug, fotos, chats, reseñas, favoritos, suscripción, pagos, cobertura y analíticas.
7. Al rechazar u observar, Oficio sigue activo y el usuario puede corregir/reintentar. No se borra información.

## Categorías

Cada categoría raíz y sus hijas pertenecen a exactamente un tipo: `OFICIO`, `PROFESIONAL` o `NEGOCIO`.

- Registro, edición, Admin y API validan que cada categoría hija tenga padre activo y `forType` igual al tipo del perfil.
- No habrá migración masiva de categorías existentes.
- Se crean nuevas categorías profesionales solo después de revisar el catálogo oficial.
- Para casos como electricista, se usan categorías explícitas y exclusivas, por ejemplo `Electricista` en Oficios y `Técnico electricista certificado` en Profesionales. La misma categoría no pertenece a dos tipos en V1.

## Impacto por sistema

| Capa | Cambios principales |
|---|---|
| Backend/BD | Enum, invariante XOR, perfiles/solicitudes profesionales, contratos API, validación de categorías, búsqueda, cache e historial de migración. |
| Admin | Filtros Oficios/Profesionales/Negocios, cola independiente de migraciones, revisión de credenciales, copy y felicitación profesional. |
| Móvil | Inicio con tres rutas de descubrimiento, registro de tres opciones proveedor, modelo/tipos centralizados, filtros, panel, selector, chat, pagos, notificaciones y migración. |
| Web | Onboarding, `/buscar`, perfil público, panel, selector, categorías y etiquetas. Oficio deja de llamarse “Profesional”. |
| Ofi | DTO, contexto de perfil, conocimiento, filtros y respuestas para tres tipos; distingue Oficio de Profesional. |
| Seguridad | Documentos privados, URLs firmadas, autorización por propietario/Admin, validación estricta de URLs y no exponer DNI, certificado ni registro sensible. |

## Fases de ejecución

### Fase 0 — Contrato y auditoría de datos

- Congelar nombres y matriz de categorías inicial.
- Consulta manual de solo lectura en Supabase: [`backend/prisma/sql/auditar_servicios_profesionales.sql`](../backend/prisma/sql/auditar_servicios_profesionales.sql) inventaría categorías sin `forType`, hijas inconsistentes, proveedores incompatibles y relaciones que se deben preservar.
- Definir copy, badge y criterios de revisión.
- Diseñar respuesta API canónica y compatibilidad de aliases.

**Salida:** especificación aprobada y SQL revisado; todavía sin mutar producción.

**Validación local 2026-07-29:** la consulta se ejecutó con éxito en
`oficio_test_db`; allí existen 17 categorías raíz sin `forType` y no hay
proveedores de prueba. Ese resultado no representa producción: el propietario
debe ejecutar la misma consulta manualmente en Supabase antes de clasificar o
crear categorías reales.

### Fase 1 — Base de datos y backend compatible

- Actualizar `schema.prisma`.
- Preparar SQL idempotente manual: enum, tablas aditivas, índices, constraints y backfill nulo seguro.
- Implementar guardrails de tipos/categorías y aliases de lectura.
- Añadir endpoints de perfil y solicitud de migración.
- Pruebas unitarias e integración de invariantes y preservación de `Provider.id`.

**Gate:** usuario aplica SQL manualmente y confirma resultado. No merge antes.

### Fase 2 — Admin de revisión y migración

- Cola, detalle, aprobar/rechazar/observar solicitud profesional.
- Transacción de aprobación sin plan de cortesía, referidos ni cambio de rol.
- Notificaciones y felicitación profesional diferenciadas.
- Auditoría de permisos y documentos privados.

### Fase 3 — Móvil y web, UX consistente

- Centralizar tipo/etiqueta/icono/color; nunca tratar “todo lo que no es negocio” como Oficio.
- Inicio, búsqueda y categorías con Oficios / Profesionales / Negocios.
- Registro breve y migración prellenada.
- Panel, perfil público, chat, pagos, notificaciones y selector adaptados.
- Respetar `context.colors`, `AppColors.tintOn/onSolid`, patrones de cards/sheets, animaciones existentes y tema claro/oscuro.

### Fase 4 — Ofi, regresión y lanzamiento

- Actualizar Ofi y KB para los tres perfiles.
- Pruebas end-to-end de registro, migración aprobada/rechazada, login frío, filtros, categoría, panel, privacidad y compatibilidad legacy.
- Verificación dirigida backend/móvil/admin/web en Node 20.
- PRs pequeños, CI verde, revisión final y despliegue.

## Pruebas obligatorias

1. Alias legacy `PROFESSIONAL -> OFICIO` y `BUSINESS -> NEGOCIO` siguen leyendo correctamente.
2. `OFICIO + NEGOCIO` y `PROFESIONAL + NEGOCIO` permitidos; `OFICIO + PROFESIONAL` rechazado por API y BD.
3. Registro, edición y Admin rechazan categorías ajenas al tipo.
4. Solicitud de migración no altera tipo, visibilidad, rol, plan, categorías actuales ni relaciones.
5. Aprobación mantiene mismo `Provider.id`, slug, fotos, reseñas, favoritos, chats, pagos, plan, cobertura y analíticas.
6. Rechazo mantiene Oficio activo y permite reintento.
7. Perfil público muestra badge solo con credencial aprobada; nunca documentos privados.
8. Filtros y cachés no mezclan Oficios, Profesionales y Negocios.
9. Móvil/web/Admin/Ofi reciben `PROFESIONAL` sin fallback silencioso a Oficio.
10. Tema claro/oscuro y accesibilidad se verifican en UI afectada.

## Riesgos bloqueados explícitamente

- No reutilizar `PROFESSIONAL` como nuevo valor; está ocupado por compatibilidad legacy.
- No reutilizar aprobación/rechazo de alta de proveedor para migración.
- No crear un segundo `Provider` ni mover relaciones.
- No reasignar categorías masivamente.
- No volver obligatorios título, colegiatura, redes o documentos.
- No publicar credenciales sin aprobación administrativa.
- No mezclar esta tanda con el ajuste local pendiente de doble scroll.

## Estado y siguiente decisión

Documento listo para revisión. Se espera aprobación explícita del propietario para iniciar Fase 0/Fase 1. No hay commits ni push autorizados.
