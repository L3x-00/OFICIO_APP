-- Fase 2 IA "Ofi": Knowledge Base dinámica.
-- DDL estándar que emite Prisma para el modelo AiKnowledgeEntry.
-- Migración DIFERIDA: aplicar a Supabase con `prisma migrate deploy`
-- apuntando a la URL directa (puerto 5432, sin pgbouncer).

-- CreateTable
CREATE TABLE "ai_knowledge_entries" (
    "id" SERIAL NOT NULL,
    "topic" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_knowledge_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_knowledge_entries_topic_key" ON "ai_knowledge_entries"("topic");

-- CreateIndex
CREATE INDEX "ai_knowledge_entries_isActive_idx" ON "ai_knowledge_entries"("isActive");
