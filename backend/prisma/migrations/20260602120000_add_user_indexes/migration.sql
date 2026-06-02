-- Índices secundarios en users (auditoría M6).
-- Aceleran el listado admin filtrado por rol/estado y la analítica geográfica.

-- CreateIndex
CREATE INDEX "users_role_isActive_idx" ON "users"("role", "isActive");

-- CreateIndex
CREATE INDEX "users_department_province_idx" ON "users"("department", "province");
