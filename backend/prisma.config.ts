import { defineConfig, env } from 'prisma/config';
import { join } from 'node:path';

export default defineConfig({
  schema: join(process.cwd(), 'prisma', 'schema.prisma'),
  migrations: {
    seed: 'npx tsx ./prisma/seed.ts',
  },
  datasource: {
    // Si env('DATABASE_URL') falla, usará la cadena de conexión de tu oficio_db
    url: env('DATABASE_URL') ?? "postgresql://oficio_user:oficio_pass_2025@localhost:5432/oficio_db",
  },
});