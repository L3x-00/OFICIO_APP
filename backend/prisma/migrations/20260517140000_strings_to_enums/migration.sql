-- Convierte 7 columnas String "status/tipo" a ENUMs Postgres para que
-- la BD rechace valores arbitrarios. Antes el DTO era la única gate;
-- un INSERT directo o un bug de validación podía meter cualquier string.
--
-- ╔══════════════════════════════════════════════════════════════╗
-- ║  PRE-CHECK OBLIGATORIO antes de aplicar esta migración       ║
-- ║  Si CUALQUIERA de estas queries retorna filas, hay valores   ║
-- ║  invalidos en BD que romperán el CAST. Limpiar primero o     ║
-- ║  la migración falla a la mitad (lo cual deja un estado feo). ║
-- ╠══════════════════════════════════════════════════════════════╣
-- ║                                                              ║
-- ║  SELECT DISTINCT status FROM plan_requests                   ║
-- ║    WHERE status NOT IN ('PENDIENTE','APROBADO','RECHAZADO'); ║
-- ║                                                              ║
-- ║  SELECT DISTINCT plan FROM coin_redemptions                  ║
-- ║    WHERE plan IS NOT NULL                                    ║
-- ║      AND plan NOT IN ('GRATIS','ESTANDAR','PREMIUM');        ║
-- ║                                                              ║
-- ║  SELECT DISTINCT reason FROM provider_reports                ║
-- ║    WHERE reason NOT IN                                       ║
-- ║      ('INFORMACION_FALSA','COMPORTAMIENTO','FRAUDE',         ║
-- ║       'FOTO_INAPROPIADA','NO_PRESTO','OTRO');                ║
-- ║                                                              ║
-- ║  SELECT DISTINCT "eventType" FROM provider_analytics         ║
-- ║    WHERE "eventType" NOT IN                                  ║
-- ║      ('whatsapp_click','call_click','view',                  ║
-- ║       'profile_view','favorite_add');                        ║
-- ║                                                              ║
-- ║  SELECT DISTINCT "docType" FROM verification_docs            ║
-- ║    WHERE "docType" NOT IN                                    ║
-- ║      ('dni','antecedentes','certificado');                   ║
-- ║                                                              ║
-- ║  SELECT DISTINCT method FROM payments                        ║
-- ║    WHERE method NOT IN                                       ║
-- ║      ('yape','bcp_deposito','mercadopago');                  ║
-- ║                                                              ║
-- ║  SELECT DISTINCT reason FROM offer_reports                   ║
-- ║    WHERE reason NOT IN                                       ║
-- ║      ('SPAM','PRECIO_FALSO','CONTENIDO_INAPROPIADO','OTRO'); ║
-- ║                                                              ║
-- ╚══════════════════════════════════════════════════════════════╝


-- ── 1. PlanRequest.status ────────────────────────────────────
CREATE TYPE "PlanRequestStatus" AS ENUM ('PENDIENTE','APROBADO','RECHAZADO');
ALTER TABLE "plan_requests"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "PlanRequestStatus" USING "status"::"PlanRequestStatus",
  ALTER COLUMN "status" SET DEFAULT 'PENDIENTE'::"PlanRequestStatus";


-- ── 2. CoinRedemption.plan (reusa SubscriptionPlan existente) ──
-- SubscriptionPlan ya existe con valores GRATIS|ESTANDAR|PREMIUM.
ALTER TABLE "coin_redemptions"
  ALTER COLUMN "plan" TYPE "SubscriptionPlan" USING "plan"::"SubscriptionPlan";


-- ── 3. ProviderReport.reason ─────────────────────────────────
CREATE TYPE "ReportReason" AS ENUM (
  'INFORMACION_FALSA','COMPORTAMIENTO','FRAUDE',
  'FOTO_INAPROPIADA','NO_PRESTO','OTRO'
);
ALTER TABLE "provider_reports"
  ALTER COLUMN "reason" TYPE "ReportReason" USING "reason"::"ReportReason";


-- ── 4. ProviderAnalytic.eventType ────────────────────────────
-- Incluye 'view' Y 'profile_view': el código histórico emite 'view',
-- el comentario del schema decía 'profile_view'. Aceptamos ambos hasta
-- consolidar (ver issue/TODO).
CREATE TYPE "AnalyticEvent" AS ENUM (
  'whatsapp_click','call_click','view','profile_view','favorite_add'
);
ALTER TABLE "provider_analytics"
  ALTER COLUMN "eventType" TYPE "AnalyticEvent" USING "eventType"::"AnalyticEvent";


-- ── 5. VerificationDoc.docType ───────────────────────────────
CREATE TYPE "VerificationDocType" AS ENUM ('dni','antecedentes','certificado');
ALTER TABLE "verification_docs"
  ALTER COLUMN "docType" TYPE "VerificationDocType" USING "docType"::"VerificationDocType";


-- ── 6. Payment.method ────────────────────────────────────────
CREATE TYPE "PaymentMethod" AS ENUM ('yape','bcp_deposito','mercadopago');
ALTER TABLE "payments"
  ALTER COLUMN "method" DROP DEFAULT,
  ALTER COLUMN "method" TYPE "PaymentMethod" USING "method"::"PaymentMethod";


-- ── 7. OfferReport.reason ────────────────────────────────────
CREATE TYPE "OfferReportReason" AS ENUM (
  'SPAM','PRECIO_FALSO','CONTENIDO_INAPROPIADO','OTRO'
);
ALTER TABLE "offer_reports"
  ALTER COLUMN "reason" TYPE "OfferReportReason" USING "reason"::"OfferReportReason";
