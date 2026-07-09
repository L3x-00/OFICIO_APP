-- ═══════════════════════════════════════════════════════════════════
-- subscription_audit_log — tabla + trigger de auditoría (idempotente)
-- ═══════════════════════════════════════════════════════════════════
-- Registra una fila cada vez que cambia status o plan de una subscription.
-- `changedBy` se lee del GUC `app.current_user_id` que el backend setea
-- con `set_config('app.current_user_id', <id>, true)` (scope is_local=true)
-- al inicio de la transacción — así distingue cambios user-driven vs admin.
--
-- Hasta aplicar esto, las activaciones de plan funcionan igual pero NO
-- dejan rastro de auditoría (el trigger simplemente no existe todavía).
--
-- APLICAR MANUALMENTE en Supabase SQL Editor (protocolo /sql-prod).
-- Re-aplicarlo es seguro: todo es IF NOT EXISTS / OR REPLACE / DROP+CREATE.
-- Los enums SubscriptionStatus y SubscriptionPlan ya existen en prod.

-- 1. Tabla
CREATE TABLE IF NOT EXISTS "subscription_audit_log" (
    "id" SERIAL NOT NULL,
    "subscriptionId" INTEGER NOT NULL,
    "oldStatus" "SubscriptionStatus" NOT NULL,
    "newStatus" "SubscriptionStatus" NOT NULL,
    "oldPlan" "SubscriptionPlan" NOT NULL,
    "newPlan" "SubscriptionPlan" NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedBy" INTEGER,
    CONSTRAINT "subscription_audit_log_pkey" PRIMARY KEY ("id")
);

-- 2. Índice
CREATE INDEX IF NOT EXISTS "subscription_audit_log_subscriptionId_changedAt_idx"
  ON "subscription_audit_log" ("subscriptionId", "changedAt");

-- 3. FK a subscriptions (Postgres < 16 no tiene ADD CONSTRAINT IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'subscription_audit_log_subscriptionId_fkey'
  ) THEN
    ALTER TABLE "subscription_audit_log"
      ADD CONSTRAINT "subscription_audit_log_subscriptionId_fkey"
      FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  END IF;
END $$;

-- 4. Función del trigger
CREATE OR REPLACE FUNCTION trg_subscriptions_audit()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_user_id int;
BEGIN
  IF NEW.status = OLD.status AND NEW.plan = OLD.plan THEN
    RETURN NEW;
  END IF;

  BEGIN
    v_user_id := current_setting('app.current_user_id', true)::int;
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;
  END;

  INSERT INTO subscription_audit_log
    ("subscriptionId", "oldStatus", "newStatus", "oldPlan", "newPlan", "changedBy")
  VALUES
    (OLD.id, OLD.status, NEW.status, OLD.plan, NEW.plan, v_user_id);

  RETURN NEW;
END $$;

-- 5. Trigger
DROP TRIGGER IF EXISTS subscriptions_audit_trg ON subscriptions;
CREATE TRIGGER subscriptions_audit_trg
  AFTER UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION trg_subscriptions_audit();


-- ═══════════════════════════════════════════════════════════════════
-- VERIFICACIÓN — corre SOLO este bloque para saber si ya está aplicado.
-- Debe devolver las 3 filas con "ok". Si alguna falta, aplica el script.
-- ═══════════════════════════════════════════════════════════════════
-- SELECT 'tabla'   AS objeto, to_regclass('public.subscription_audit_log') IS NOT NULL AS ok
-- UNION ALL
-- SELECT 'funcion', EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'trg_subscriptions_audit')
-- UNION ALL
-- SELECT 'trigger', EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'subscriptions_audit_trg');
