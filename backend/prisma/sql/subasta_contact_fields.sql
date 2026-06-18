-- Subasta 4: contacto del cliente en las necesidades (service_requests).
-- Ejecutar en Supabase (SQL Editor) en producción.
-- Columnas nullable → retrocompatible con solicitudes existentes.
-- Prisma usa los nombres camelCase tal cual (sin @map), por eso van entre
-- comillas dobles en Postgres.

ALTER TABLE "service_requests"
  ADD COLUMN IF NOT EXISTS "clientPhone"    TEXT,
  ADD COLUMN IF NOT EXISTS "clientWhatsapp" TEXT;
