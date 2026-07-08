---
name: sql-prod
description: >-
  Protocolo de cambios de base de datos en Servi (Supabase prod): schema.prisma
  + SQL idempotente que el USUARIO aplica manualmente. Usar SIEMPRE que un
  cambio necesite tabla/columna/índice nuevo, o el usuario mencione migración,
  schema, Supabase o SQL a producción.
---

# Cambios de BD: schema + SQL manual

El historial de migraciones Prisma está ROTO → `db push` de facto. Todo cambio
de BD sigue este protocolo. **REGLA DURA: Claude NUNCA ejecuta SQL contra
prod** — entrega el archivo y espera confirmación del usuario.

## 1. Schema

Editar `backend/prisma/schema.prisma` (modelo + relaciones + índices).
Prohibido: `dbgenerated` con referencias a columnas, `migrate deploy`,
`--force-reset`. Los triggers de BD ya manejan `location_geog`, `search_tsv`
y `subscription_audit_log` — no duplicarlos en Prisma.

## 2. Regenerar client local (no conecta a BD)

```bash
cd backend
DATABASE_URL="postgresql://u:p@localhost:5432/db" DIRECT_URL="postgresql://u:p@localhost:5432/db" npx prisma generate
```
NUNCA commitear `backend/src/generated/` — CI lo regenera (`npx prisma generate`
en ci.yml antes del build).

## 3. Archivo SQL idempotente

Crear `backend/prisma/sql/<slug>.sql` — SOLO aditivo e idempotente:
`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`,
`CREATE INDEX IF NOT EXISTS`, `INSERT ... WHERE NOT EXISTS`. Con comentario
cabecera: qué hace, por qué, "seguro de re-ejecutar", y si va ANTES o después
del deploy del código (columna nueva que el código escribe → SIEMPRE antes).

## 4. Entrega y espera

Mostrar al usuario: ruta del archivo + el SQL completo en el chat + orden de
aplicación. El usuario lo corre en Supabase (SQL editor, pooler puerto 5432).
**Bloquear el merge del PR hasta que confirme "aplicado"** (ver `/subir-pr` §6).

## Recordatorios

- `DateTime` Prisma = timestamp SIN tz (wall-clock UTC). Día Perú en SQL:
  `AT TIME ZONE 'UTC' AT TIME ZONE 'America/Lima'`. `now()` sí es timestamptz.
- Supabase free = 500 MB: nada de tablas de logs masivas (logs → stdout).
- Seeds/catálogos por nombre: match accent-insensitive (`translate()`), y ojo
  que prod puede diferir del seed (ej. "Gastronomía" vs "Alimentación y Gastronomía").
