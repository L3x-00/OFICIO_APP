-- Defensa en profundidad: CHECK constraints en los TEXT más expuestos
-- a explotación por almacenamiento masivo (DoS via texto gigante).
-- Los DTOs de NestJS ya validan, pero un bypass (script directo, otra
-- app que comparta la BD, futuro endpoint sin DTO) puede meter MB.
--
-- Política de límites (alineada con UX y con lo que el FE valida):
--   - description / message / content (texto libre):    2000 chars
--   - title / businessName / firstName / lastName:       200 chars
--   - URLs / paths:                                      500 chars
--   - phones / códigos / referencias cortas:             100 chars
--
-- PRE-CHECK (correr antes; si retorna filas, hay basura ya almacenada
-- y los ALTER fallarán; truncar o aceptar aumentar el límite):
--
--   SELECT 'providers.description' AS col, count(*) FROM providers
--     WHERE char_length(description) > 2000
--   UNION ALL SELECT 'offers.message', count(*) FROM offers
--     WHERE char_length(message) > 2000
--   UNION ALL SELECT 'chat_messages.content', count(*) FROM chat_messages
--     WHERE char_length(content) > 2000
--   UNION ALL SELECT 'service_requests.description', count(*) FROM service_requests
--     WHERE char_length(description) > 2000
--   UNION ALL SELECT 'offer_posts.description', count(*) FROM offer_posts
--     WHERE char_length(description) > 2000
--   UNION ALL SELECT 'yape_payments.note', count(*) FROM yape_payments
--     WHERE char_length(note) > 500;


-- ── Texto libre (2000) ─────────────────────────────────────
ALTER TABLE "providers"
  ADD CONSTRAINT providers_description_length
    CHECK (description IS NULL OR char_length(description) <= 2000);

ALTER TABLE "offers"
  ADD CONSTRAINT offers_message_length
    CHECK (char_length(message) <= 2000);

ALTER TABLE "chat_messages"
  ADD CONSTRAINT chat_messages_content_length
    CHECK (char_length(content) <= 2000);

ALTER TABLE "service_requests"
  ADD CONSTRAINT service_requests_description_length
    CHECK (char_length(description) <= 2000);

ALTER TABLE "offer_posts"
  ADD CONSTRAINT offer_posts_description_length
    CHECK (char_length(description) <= 2000);

ALTER TABLE "review_replies"
  ADD CONSTRAINT review_replies_content_length
    CHECK (char_length(content) <= 2000);

ALTER TABLE "platform_issues"
  ADD CONSTRAINT platform_issues_description_length
    CHECK (char_length(description) <= 2000);

ALTER TABLE "provider_reports"
  ADD CONSTRAINT provider_reports_description_length
    CHECK (description IS NULL OR char_length(description) <= 2000);


-- ── Títulos / nombres (200) ────────────────────────────────
ALTER TABLE "providers"
  ADD CONSTRAINT providers_business_name_length
    CHECK (char_length("businessName") <= 200);

ALTER TABLE "offer_posts"
  ADD CONSTRAINT offer_posts_title_length
    CHECK (char_length(title) <= 200);

ALTER TABLE "users"
  ADD CONSTRAINT users_first_name_length
    CHECK (char_length("firstName") <= 100),
  ADD CONSTRAINT users_last_name_length
    CHECK (char_length("lastName") <= 100);


-- ── URLs (500) ─────────────────────────────────────────────
ALTER TABLE "providers"
  ADD CONSTRAINT providers_website_length
    CHECK (website IS NULL OR char_length(website) <= 500),
  ADD CONSTRAINT providers_avatar_length
    CHECK (address IS NULL OR char_length(address) <= 500);

ALTER TABLE "users"
  ADD CONSTRAINT users_avatar_url_length
    CHECK ("avatarUrl" IS NULL OR char_length("avatarUrl") <= 500);

ALTER TABLE "yape_payments"
  ADD CONSTRAINT yape_payments_voucher_length
    CHECK (char_length("voucherUrl") <= 500),
  ADD CONSTRAINT yape_payments_note_length
    CHECK (note IS NULL OR char_length(note) <= 500);


-- ── Phones / cortos (100) ──────────────────────────────────
ALTER TABLE "providers"
  ADD CONSTRAINT providers_phone_length
    CHECK (char_length(phone) <= 100),
  ADD CONSTRAINT providers_whatsapp_length
    CHECK (whatsapp IS NULL OR char_length(whatsapp) <= 100);
