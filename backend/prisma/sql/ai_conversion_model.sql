-- ai_conversion_model.sql
--
-- QUÉ: crea las 2 tablas del módulo de analítica predictiva (sub-fase 2):
--   • ai_conversion_models       — snapshot del modelo de conversión entrenado
--                                  (regresión logística en TypeScript).
--   • ai_conversion_predictions  — log ACOTADO (últimas 1000) de predicciones
--                                  servidas, para el panel "en tiempo real".
--
-- POR QUÉ: persistir el modelo entre reinicios de Render (el free tier duerme)
--   y alimentar el panel Admin "Usabilidad de IA". Ambas tablas son ADITIVAS y
--   están DESACOPLADAS (sin FK), igual que ai_conversations.
--
-- SEGURO DE RE-EJECUTAR: sí — todo es IF NOT EXISTS.
--
-- ORDEN: aplicar ANTES del deploy del backend. Si faltan, el código degrada
--   sin romper (loadLatestModel devuelve null → el panel muestra "sin modelo"),
--   pero el modelo no persiste y las predicciones no se registran.
--
-- Tipos: DateTime de Prisma = TIMESTAMP sin zona (wall-clock UTC); Float =
--   double precision; Int = integer; los Json (arrays/objetos) = jsonb.

CREATE TABLE IF NOT EXISTS ai_conversion_models (
  id             SERIAL PRIMARY KEY,
  version        TEXT             NOT NULL,
  algorithm      TEXT             NOT NULL DEFAULT 'logistic_regression',
  "featureNames" JSONB            NOT NULL,
  weights        JSONB            NOT NULL,
  bias           DOUBLE PRECISION NOT NULL DEFAULT 0,
  "featureMeans" JSONB            NOT NULL,
  "featureStds"  JSONB            NOT NULL,
  metrics        JSONB            NOT NULL,
  "trainedAt"    TIMESTAMP        NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "ai_conversion_models_trainedAt_idx"
  ON ai_conversion_models ("trainedAt");

CREATE TABLE IF NOT EXISTS ai_conversion_predictions (
  id             SERIAL PRIMARY KEY,
  "providerId"   INTEGER,
  "modelVersion" TEXT             NOT NULL,
  probability    DOUBLE PRECISION NOT NULL,
  label          TEXT             NOT NULL,
  features       JSONB            NOT NULL,
  "createdAt"    TIMESTAMP        NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "ai_conversion_predictions_createdAt_idx"
  ON ai_conversion_predictions ("createdAt");
