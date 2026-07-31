-- FASE 1 / PASO 4 DE 4
-- Ejecutar solo si la auditoría 03 devolvió CERO filas.
-- Aditivo: protege webhooks duplicados de MercadoPago sin afectar Yape.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "payments"
    WHERE "method" = 'mercadopago'::"PaymentMethod"
      AND "reference" IS NOT NULL
    GROUP BY "reference"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'No se puede crear el índice MercadoPago: existen referencias duplicadas. Revisar auditoría 03.';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "payments_mercadopago_reference_key"
  ON "payments" ("reference")
  WHERE "method" = 'mercadopago'::"PaymentMethod"
    AND "reference" IS NOT NULL;
