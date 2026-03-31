import { defineConfig, env } from 'prisma/config';
// No uses 'path' de forma tradicional, usa la URL de importación de ESM
import { join } from 'node:path';

export default defineConfig({
  // process.cwd() asegura que encuentre la carpeta prisma desde la raíz del proyecto
  schema: join(process.cwd(), 'prisma', 'schema.prisma'),
  migrations: {
    seed: 'npx tsx ./prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});