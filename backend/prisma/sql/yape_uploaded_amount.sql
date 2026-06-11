-- Diccionario de precios Yape server-side: separamos el monto OFICIAL
-- (yape_payments.amount, fijado por el servidor) del monto DECLARADO por el
-- usuario (uploadedAmount, solo informativo para detectar discrepancias).
-- Idempotente; aditivo y no destructivo. Aplicar a PROD con el pooler (5432).
ALTER TABLE "yape_payments" ADD COLUMN IF NOT EXISTS "uploadedAmount" DOUBLE PRECISION;
