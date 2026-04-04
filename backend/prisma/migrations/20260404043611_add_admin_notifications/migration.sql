-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('APROBADO', 'RECHAZADO', 'MAS_INFO', 'VERIFICACION_REVOCADA');

-- CreateTable
CREATE TABLE "admin_notifications" (
    "id" SERIAL NOT NULL,
    "providerId" INTEGER NOT NULL,
    "type" "NotificationType" NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_notifications_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "admin_notifications" ADD CONSTRAINT "admin_notifications_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
