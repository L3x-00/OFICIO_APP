-- users.lastLoginAt — timestamp del último login exitoso.
--
-- Antes intentábamos derivarlo de `updatedAt` pero ese campo se mueve
-- con cualquier mutación del row (cambio de perfil, FCM token, etc.).
-- Columna dedicada → métrica precisa de "último acceso" para el panel
-- admin (geo-stats, retention reports, etc.).
--
-- Default NULL para users existentes (nunca los hemos visto loguearse
-- después de este deploy). Se llena la próxima vez que login() corra.

ALTER TABLE "users" ADD COLUMN "lastLoginAt" timestamp(3);
