-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('SENT', 'DELIVERED', 'READ');

-- CreateTable
CREATE TABLE "chat_rooms" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "providerId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" SERIAL NOT NULL,
    "chatRoomId" INTEGER NOT NULL,
    "senderId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "status" "MessageStatus" NOT NULL DEFAULT 'SENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chat_rooms_clientId_providerId_key" ON "chat_rooms"("clientId", "providerId");

-- CreateIndex
CREATE INDEX "chat_rooms_clientId_providerId_idx" ON "chat_rooms"("clientId", "providerId");

-- CreateIndex
CREATE INDEX "chat_messages_chatRoomId_createdAt_idx" ON "chat_messages"("chatRoomId", "createdAt");

-- AddForeignKey
ALTER TABLE "chat_rooms"
    ADD CONSTRAINT "chat_rooms_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_rooms"
    ADD CONSTRAINT "chat_rooms_providerId_fkey"
    FOREIGN KEY ("providerId") REFERENCES "providers"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages"
    ADD CONSTRAINT "chat_messages_chatRoomId_fkey"
    FOREIGN KEY ("chatRoomId") REFERENCES "chat_rooms"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
