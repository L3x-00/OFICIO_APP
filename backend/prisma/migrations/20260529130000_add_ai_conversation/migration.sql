-- Fase 4 IA "Ofi": persistencia de conversaciones y mensajes.
-- DDL estándar que emite Prisma para AiConversation + AiMessage.
-- Migración DIFERIDA: aplicar a Supabase con `prisma migrate deploy`
-- apuntando a la URL directa (puerto 5432, sin pgbouncer).

-- CreateTable
CREATE TABLE "ai_conversations" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "promptVersion" TEXT NOT NULL DEFAULT 'v1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_messages" (
    "id" SERIAL NOT NULL,
    "conversationId" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "responseTimeMs" INTEGER,
    "tokensUsed" INTEGER,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "moderationPass" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_conversations_userId_idx" ON "ai_conversations"("userId");

-- CreateIndex
CREATE INDEX "ai_conversations_createdAt_idx" ON "ai_conversations"("createdAt");

-- CreateIndex
CREATE INDEX "ai_messages_conversationId_createdAt_idx" ON "ai_messages"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "ai_messages_createdAt_idx" ON "ai_messages"("createdAt");

-- AddForeignKey
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ai_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
