import path from 'node:path';
import { defineConfig, env } from 'prisma/config';
import 'dotenv/config';

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  datasource: {
    // Usamos la variable cargada por dotenv
    url: process.env.DATABASE_URL,
  },
});