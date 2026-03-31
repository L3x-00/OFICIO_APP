import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
// Importamos directamente desde client.js (que se genera a partir de client.ts)
// La ruta es relativa desde prisma/prisma.service.ts hasta src/generated/client/client.js
import { PrismaClient } from '../src/generated/client/client.js'; 
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  // ... tus propiedades (user, category, etc)

  constructor() {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    const adapter = new PrismaPg(pool);

    // Pasamos el adaptador al constructor
    super({ adapter });
  }

  async onModuleInit() {
    // Al extender de PrismaClient desde client.js, estos métodos ya existen
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}