-- Defensa en profundidad: el DTO de NestJS ya limita estas longitudes,
-- pero un bypass (script directo, otra app que comparta la BD, migración
-- futura) podría meter texto ilimitado. Los CHECK constraints garantizan
-- el límite al nivel de almacenamiento.
--
-- PRE-CHECK antes de aplicar:
--   SELECT id, char_length(comment), char_length("photoUrl"), char_length("qrCodeUsed")
--   FROM reviews
--   WHERE char_length(comment) > 500
--      OR char_length("photoUrl") > 500
--      OR char_length("qrCodeUsed") > 100;
-- Si retorna filas, truncá/limpiá antes o esta migración falla.

ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_comment_length_check"
    CHECK (comment IS NULL OR char_length(comment) <= 500);

ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_photourl_length_check"
    CHECK ("photoUrl" IS NULL OR char_length("photoUrl") <= 500);

ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_qrcode_length_check"
    CHECK ("qrCodeUsed" IS NULL OR char_length("qrCodeUsed") <= 100);
