-- FASE 1 / AUDITORÍA PREVIA DE IDEMPOTENCIA DE MERCADOPAGO
-- Solo lectura. Ejecutar antes del archivo 04.
-- Los códigos Yape son cortos y repetibles; por eso esta auditoría filtra
-- exclusivamente pagos MercadoPago con referencia no nula.

SELECT
  "reference",
  COUNT(*) AS occurrences,
  MIN("createdAt") AS first_seen_at,
  MAX("createdAt") AS last_seen_at
FROM "payments"
WHERE "method" = 'mercadopago'::"PaymentMethod"
  AND "reference" IS NOT NULL
GROUP BY "reference"
HAVING COUNT(*) > 1
ORDER BY occurrences DESC, last_seen_at DESC;
