import { defineConfig, env } from 'prisma/config';
import { join } from 'node:path';

export default defineConfig({
  schema: join(process.cwd(), 'prisma', 'schema.prisma'),
  migrations: {
    seed: 'npx tsx ./prisma/seed.ts',
  },
  datasource: {
    // Prioridad: process.env > .env > fallback local.
    // env() de 'prisma/config' SOLO lee .env, ignora process.env.
    // Por eso aquí leemos process.env primero — así PowerShell
    // $env:DATABASE_URL="..." sí funciona para apuntar a Supabase
    // sin tocar .env.
    url: process.env.DATABASE_URL
      ?? env('DATABASE_URL')
      ?? 'postgresql://oficio_user:oficio_pass_2025@localhost:5432/oficio_db',
  },
});