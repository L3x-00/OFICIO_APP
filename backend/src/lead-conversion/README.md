# Paso 6 — Conversión de leads NEGOCIO → Provider real

Sistema **local e independiente**: toma leads `CONSENTED` de las tablas de
staging (`provider_leads`, cargadas por el panel de scraping) y crea el
`User` + `Provider` reales de Servi para que el negocio aparezca en la
plataforma.

**No** se importa en `AppModule` → no agrega superficie al backend desplegado.
Se corre a mano contra la BD que apunte `DATABASE_URL` (local o Supabase).

## Archivos

- `lead-conversion.core.ts` — lógica pura y testeable (`convertLead`,
  `categoryIdsFromLead`, `resolveLocality`). Reusa la validación real del
  registro (`validateProviderCategorySelection`, `uniqueSlug`, `bcrypt`).
- `../../scripts/convert-leads.ts` — CLI que lee el staging por SQL crudo y
  llama a `convertLead`. Dry-run por defecto.
- `../../test/unit/lead-conversion.core.spec.ts` — blindaje (jest unit).

## Requisitos previos

0. Inicializar el submódulo que contiene el panel y su SQL:

   ```bash
   git submodule update --init --recursive
   ```

   El panel está en `tools/provider-leads/tools/provider-leads` y su DDL
   idempotente en `sql/provider_leads_staging.sql`.
1. `provider_leads_staging.sql` aplicado en la BD (una sola vez).
2. `import.sql` del panel cargado — genera `suggestedEmail`/`suggestedPassword`
   solo para leads `CONSENTED`.
3. El lead tiene teléfono, descripción, categorías y coordenadas GPS válidas.
   La herramienta rechaza una fila incompleta para no crear un Provider que el
   formulario real rechazaría o que no aparecería en búsquedas por radio.

## Uso

```bash
cd backend

# 1) Ver qué convertiría (NO escribe nada)
npm run convert-leads

# 2) Crear los negocios (quedan PENDIENTE, esperando aprobación admin)
npm run convert-leads -- --commit

# 3) Crear y ADEMÁS aprobar/visibilizar en el mismo paso
npm run convert-leads -- --commit --approve

# Tope de leads por corrida (default 50)
npm run convert-leads -- --commit --limit 10

# Sin subir fotos a R2
npm run convert-leads -- --commit --skip-photos
```

## Fotos → R2

Con `--commit` (y `MINIO_ACCESS_KEY` presente), el CLI descarga las fotos
guardadas del lead (`provider_lead_photos.url`) y las sube a R2 vía
`MinioService` (re-encoda con sharp, primera = portada), creando las
`ProviderImage`. Best-effort: una foto que falla se omite, el resto sigue.
`--skip-photos` lo desactiva.

> ⚠️ **Ojo con el entorno**: `MINIO_*` en `.env` apunta a **R2 de producción**.
> Correr el `--commit` sin `--skip-photos` sube imágenes a R2 real. Para probar
> en local, exportá las variables MINIO apuntando a la MinIO de docker antes de
> correr (dotenv NO pisa variables ya seteadas en el shell).

## Comportamiento

- Solo procesa leads `consentStatus = 'CONSENTED'`, sin `convertedProviderId`,
  con credenciales sugeridas presentes.
- Crea `User` (rol USUARIO, `isEmailVerified=false`, password bcrypt del
  `suggestedPassword`) + `Provider` NEGOCIO en **PENDIENTE / invisible**, con
  sus categorías (una principal) y la localidad resuelta desde dept/prov/dist.
- Copia `latitude`/`longitude` del staging al Provider para alimentar el trigger
  `location_geog`; sin ambas coordenadas la conversión se rechaza.
- `--approve`: replica los efectos de la aprobación admin (verificado, visible,
  `planPriority`, rol PROVEEDOR y `Subscription` de cortesía). No emite
  notificaciones/FCM.
- **Idempotente**: si el usuario ya existe con su NEGOCIO, no duplica; tras
  convertir, marca el lead `status='CONVERTED'` + `convertedProviderId`.

## Fuera de alcance

- Enlace de auto-registro pre-cargado (Opción A): superado por este tool, que ya
  crea la cuenta (User+Provider) con credenciales sugeridas. Solo tendría sentido
  si se quiere el UX de que el negocio se onboardee solo — feature web aparte.
