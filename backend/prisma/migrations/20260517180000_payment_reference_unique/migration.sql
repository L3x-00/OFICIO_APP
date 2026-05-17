-- Payment.reference UNIQUE — gate de idempotencia para webhooks MP/Yape.
-- MP puede reintentar el mismo webhook (timeout, error de red). Sin
-- unique, cada reintento crea una fila duplicada en `payments`, envía
-- otra push notif, y `endDate` se renueva otra vez (robándole días al
-- usuario).
--
-- PRE-CHECK: si hay duplicados existentes el ALTER falla. Verificar:
--   SELECT reference, count(*) FROM payments
--   WHERE reference IS NOT NULL
--   GROUP BY reference HAVING count(*) > 1;
-- Si retorna filas: consolidar (dejar la más antigua, borrar el resto).
--
-- Nota Postgres: NULL != NULL en UNIQUE, así que múltiples filas con
-- reference IS NULL coexisten sin problema (no rompe pagos legacy).

CREATE UNIQUE INDEX "payments_reference_key" ON "payments"("reference");
