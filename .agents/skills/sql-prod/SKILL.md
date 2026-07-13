---
name: sql-prod
description: >-
  Protocolo de cambios de base de datos en Servi (Supabase prod): schema.prisma
  + SQL idempotente que el USUARIO aplica manualmente. Usar siempre ante
  tabla/columna/índice, migración, schema, Supabase o SQL a producción.
---

# Cambios BD: schema + SQL manual

Estas reglas específicas de Servi prevalecen sobre skills genéricos `supabase`
y `supabase-postgres-best-practices`.

## Reglas duras

- Nunca ejecutar SQL contra producción desde el agente.
- Nunca usar MCP `execute_sql`/`apply_migration` contra prod.
- Nunca `migrate deploy`, `--force-reset` ni `db push` contra prod.
- El usuario aplica el SQL manualmente y confirma antes del merge.
- Mantener Prisma `DateTime` como timestamp sin zona; la convención Servi
  prevalece sobre recomendaciones genéricas de `timestamptz`.

## 1. Schema

Editar `backend/prisma/schema.prisma`: modelos, relaciones e índices. No usar
`dbgenerated` con referencias a columnas. No duplicar triggers de
`location_geog`, `search_tsv` o `subscription_audit_log`.

## 2. Cliente local

Desde `backend/`:

```powershell
$env:DATABASE_URL = 'postgresql://u:p@localhost:5432/db'
$env:DIRECT_URL = $env:DATABASE_URL
npx prisma format
npx prisma generate
```

No conecta. Nunca commitear `backend/src/generated/`.

## 3. SQL idempotente

Crear `backend/prisma/sql/<slug>.sql`. Solo cambios aditivos re-ejecutables:
`IF NOT EXISTS`, bloques `DO` para constraints, backfill seguro. Cabecera:
qué, por qué, idempotencia y orden respecto al deploy. Si código escribe columna
nueva, SQL va antes.

## 4. Entrega y gate

Mostrar ruta, SQL completo y orden. Esperar confirmación explícita del usuario.
No mergear antes.

## Gotchas

- Día Perú desde Prisma `DateTime`:
  `AT TIME ZONE 'UTC' AT TIME ZONE 'America/Lima'`.
- `now()` ya es `timestamptz`.
- Supabase free 500 MB: logs operativos a stdout.
- Catálogos prod pueden diferir del seed; comparar sin acentos cuando aplique.
