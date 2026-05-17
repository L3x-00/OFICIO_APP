-- Parte 4 — Triggers de automatización:
--   a) Recálculo de averageRating/totalReviews/totalRecommendations
--   b) Auditoría de cambios de status en subscriptions
--   c) updated_at automático (defensa contra mutaciones bypass-Prisma)
--   d) Pago de monedas al APROBAR un referral
--
-- TODOS los triggers corren en la misma transacción que el statement
-- que los dispara — atomicidad garantizada por Postgres sin BEGIN/COMMIT
-- explícito. Si el trigger lanza una excepción, el statement se aborta.

-- ═══════════════════════════════════════════════════════════════
-- 0. PREP: tabla de auditoría + columna updatedAt en subscriptions
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE "subscriptions"
  ADD COLUMN "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "subscription_audit_log" (
  id              SERIAL PRIMARY KEY,
  "subscriptionId" int NOT NULL REFERENCES "subscriptions"(id) ON DELETE CASCADE,
  "oldStatus"     "SubscriptionStatus" NOT NULL,
  "newStatus"     "SubscriptionStatus" NOT NULL,
  "oldPlan"       "SubscriptionPlan"   NOT NULL,
  "newPlan"       "SubscriptionPlan"   NOT NULL,
  "changedAt"     timestamp(3)         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "changedBy"     int                  -- nullable: cambios automáticos del sistema
);

CREATE INDEX "subscription_audit_log_subscriptionId_changedAt_idx"
  ON "subscription_audit_log" ("subscriptionId", "changedAt");


-- ═══════════════════════════════════════════════════════════════
-- a) Recálculo de rating + recomendaciones
-- ═══════════════════════════════════════════════════════════════
--
-- Función reutilizable que dado un providerId recalcula:
--   - averageRating (AVG sobre reviews visibles)
--   - totalReviews  (COUNT sobre reviews visibles)
--   - totalRecommendations (COUNT sobre recommendations)
-- y persiste el resultado en providers.
--
-- 3 triggers la disparan:
--   * reviews INSERT/UPDATE/DELETE  → recalcula rating+totalReviews
--   * recommendations INSERT/DELETE → recalcula totalRecommendations
--
-- Diseño defensivo: la función toma el providerId tanto de NEW como de
-- OLD según el TG_OP (INSERT no tiene OLD; DELETE no tiene NEW), y
-- maneja UPDATE de providerId (raro pero posible: una review reasignada).

CREATE OR REPLACE FUNCTION recompute_provider_stats(p_provider_id int)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_avg  numeric;
  v_revs int;
  v_recs int;
BEGIN
  SELECT COALESCE(AVG(rating), 0), COUNT(*)
    INTO v_avg, v_revs
  FROM reviews
  WHERE "providerId" = p_provider_id AND "isVisible" = true;

  SELECT COUNT(*)
    INTO v_recs
  FROM recommendations
  WHERE "providerId" = p_provider_id;

  UPDATE providers
  SET "averageRating"        = ROUND(v_avg::numeric, 2),
      "totalReviews"         = v_revs,
      "totalRecommendations" = v_recs
  WHERE id = p_provider_id;
END $$;


-- Trigger function para reviews — cubre INSERT/UPDATE/DELETE y el
-- caso edge de reasignación de providerId en un UPDATE.
CREATE OR REPLACE FUNCTION trg_reviews_recompute()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM recompute_provider_stats(NEW."providerId");
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM recompute_provider_stats(OLD."providerId");
  ELSE  -- UPDATE
    IF NEW."providerId" IS DISTINCT FROM OLD."providerId" THEN
      PERFORM recompute_provider_stats(OLD."providerId");
    END IF;
    PERFORM recompute_provider_stats(NEW."providerId");
  END IF;
  RETURN NULL;  -- AFTER trigger, return val ignorado
END $$;

DROP TRIGGER IF EXISTS reviews_recompute_trg ON reviews;
CREATE TRIGGER reviews_recompute_trg
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION trg_reviews_recompute();


-- Trigger function para recommendations — INSERT/DELETE (no se "actualizan").
CREATE OR REPLACE FUNCTION trg_recommendations_recompute()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM recompute_provider_stats(NEW."providerId");
  ELSE  -- DELETE
    PERFORM recompute_provider_stats(OLD."providerId");
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS recommendations_recompute_trg ON recommendations;
CREATE TRIGGER recommendations_recompute_trg
  AFTER INSERT OR DELETE ON recommendations
  FOR EACH ROW EXECUTE FUNCTION trg_recommendations_recompute();


-- ═══════════════════════════════════════════════════════════════
-- b) Auditoría de cambios de status en subscriptions
-- ═══════════════════════════════════════════════════════════════
--
-- Registra una fila en subscription_audit_log cada vez que status o
-- plan cambian. `changedBy` se setea via custom GUC opcional:
--   SET LOCAL app.current_user_id = 123;
--   UPDATE subscriptions SET status='ACTIVA' WHERE id=1;
-- Si no se setea (cron automático), queda NULL.

CREATE OR REPLACE FUNCTION trg_subscriptions_audit()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_user_id int;
BEGIN
  -- Si nada cambió (status y plan iguales), no auditamos.
  IF NEW.status = OLD.status AND NEW.plan = OLD.plan THEN
    RETURN NEW;
  END IF;

  -- Intentar leer userId del contexto. Si no se setó, queda null.
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

DROP TRIGGER IF EXISTS subscriptions_audit_trg ON subscriptions;
CREATE TRIGGER subscriptions_audit_trg
  AFTER UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION trg_subscriptions_audit();


-- ═══════════════════════════════════════════════════════════════
-- c) updated_at / updatedAt automático
-- ═══════════════════════════════════════════════════════════════
--
-- Función reutilizable que setea NEW."updatedAt" = now() antes de cada
-- UPDATE. Prisma ya lo hace via @updatedAt cuando la mutación pasa por
-- su cliente — esto cubre el caso de SQL crudo, cron jobs y otras apps.

CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END $$;

-- Aplicar a todas las tablas con updatedAt
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'providers',
    'users',
    'service_requests',
    'offers',
    'plan_requests',
    'yape_payments',
    'trust_validation_requests',
    'referral_rewards',
    'user_penalties',
    'subscriptions'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at_trg ON %I', tbl);
    EXECUTE format(
      'CREATE TRIGGER set_updated_at_trg
         BEFORE UPDATE ON %I
         FOR EACH ROW EXECUTE FUNCTION update_modified_column()',
      tbl
    );
  END LOOP;
END $$;


-- ═══════════════════════════════════════════════════════════════
-- d) Pago de monedas al APROBAR un referral
-- ═══════════════════════════════════════════════════════════════
--
-- Cuando un Referral pasa a status='APPROVED':
--   * users[inviter].coins += referral.coinsAwarded
--   * users[invited].coins += referral.invitedCoinsAwarded
--   * referral.approvedAt = now()
--   * referralCodes del inviter: successfulInvites += 1
--
-- Atomicidad: el trigger corre dentro de la misma transacción que el
-- UPDATE en referrals, así que si cualquier paso falla, todo rollback.
-- No necesitamos BEGIN/COMMIT explícito.
--
-- Defensa contra doble pago: solo dispara cuando OLD.status != 'APPROVED'
-- y NEW.status = 'APPROVED' (es decir, en la TRANSICIÓN, no en cada
-- update). Re-aprobar una ya aprobada no paga de nuevo.

CREATE OR REPLACE FUNCTION trg_referral_approved_award()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'APPROVED'
     AND (OLD.status IS NULL OR OLD.status <> 'APPROVED')
  THEN
    -- Acreditar monedas al inviter (si corresponde).
    IF NEW."coinsAwarded" > 0 THEN
      UPDATE users
      SET coins = coins + NEW."coinsAwarded"
      WHERE id = NEW."inviterId";
    END IF;

    -- Acreditar monedas de bienvenida al invited (si corresponde).
    IF NEW."invitedCoinsAwarded" > 0 THEN
      UPDATE users
      SET coins = coins + NEW."invitedCoinsAwarded"
      WHERE id = NEW."invitedUserId";
    END IF;

    -- Setear approvedAt si el caller no lo hizo explícitamente.
    IF NEW."approvedAt" IS NULL THEN
      NEW."approvedAt" := CURRENT_TIMESTAMP;
    END IF;

    -- Incrementar el contador de invitaciones exitosas del inviter.
    UPDATE referral_codes
    SET "successfulInvites" = "successfulInvites" + 1
    WHERE "userId" = NEW."inviterId";
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS referral_approved_award_trg ON referrals;
CREATE TRIGGER referral_approved_award_trg
  BEFORE UPDATE ON referrals
  FOR EACH ROW EXECUTE FUNCTION trg_referral_approved_award();
