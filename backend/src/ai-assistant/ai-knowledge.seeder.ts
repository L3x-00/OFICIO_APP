import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Prisma } from '../generated/client/client.js';

/**
 * Seeder idempotente de la Knowledge Base de "Ofi".
 *
 * Al arrancar el módulo, si la tabla está vacía inserta el conocimiento
 * base de Servi. Si ya hay filas (porque el admin editó la KB), NO toca
 * nada. Resiliente: si la BD no está lista (tabla aún sin migrar, Redis
 * caído, etc.) loguea y sigue — nunca tumba el arranque de la app.
 */
@Injectable()
export class AiKnowledgeSeeder implements OnModuleInit {
  private readonly logger = new Logger(AiKnowledgeSeeder.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    try {
      const count = await this.prisma.aiKnowledgeEntry.count();
      if (count > 0) {
        this.logger.log(`Knowledge base ya tiene ${count} entries — no seed`);
        return;
      }
      await this.prisma.aiKnowledgeEntry.createMany({
        data: AiKnowledgeSeeder.SEED.map((e) => ({
          topic: e.topic,
          // El content es JSON estructurado → InputJsonValue de Prisma.
          content: e.content as Prisma.InputJsonValue,
          version: 1,
          isActive: true,
        })),
        skipDuplicates: true,
      });
      this.logger.log(
        `Knowledge base sembrada con ${AiKnowledgeSeeder.SEED.length} entries`,
      );
    } catch (e) {
      // Tabla no migrada todavía / BD no lista → no es fatal para la app.
      this.logger.warn(
        `Seed de knowledge omitido: ${(e as Error)?.message ?? e}`,
      );
    }
  }

  /** Conocimiento base de Servi (editable luego desde el admin). */
  private static readonly SEED: Array<{
    topic: string;
    content: Record<string, unknown>;
  }> = [
    {
      topic: 'que_es_servi',
      content: {
        resumen:
          'Servi es un marketplace de servicios locales del Perú que conecta ' +
          'clientes con profesionales (OFICIO) y negocios (NEGOCIO) verificados ' +
          'de su ciudad.',
        para_clientes: 'Buscar y contactar proveedores es 100% gratis.',
        para_proveedores:
          'Crean un perfil, suben fotos y reciben clientes. Pagan una ' +
          'suscripción para más visibilidad.',
      },
    },
    {
      topic: 'tipos_de_perfil',
      content: {
        OFICIO: 'Profesional independiente: electricista, gasfitero, etc.',
        NEGOCIO: 'Local o establecimiento: pollería, peluquería, etc.',
        nota: 'Un mismo usuario puede tener perfil OFICIO y NEGOCIO a la vez.',
      },
    },
    {
      topic: 'planes_y_pagos',
      content: {
        GRATIS:
          'Plan base. Todo proveedor nuevo recibe 1 mes de Estándar de regalo.',
        ESTANDAR:
          'S/ 19.90/mes — más visibilidad, hasta 6 fotos y 6 servicios.',
        PREMIUM: 'S/ 39.90/mes — máxima visibilidad, más fotos y servicios.',
        metodos: 'Pago con Yape (subiendo comprobante) o MercadoPago.',
      },
    },
    {
      topic: 'reseñas_y_confianza',
      content: {
        reseñas:
          'Los clientes dejan reseñas con calificación 1-5, foto y validación ' +
          'por GPS o código QR del proveedor (anti-fraude).',
        confiable:
          'Los proveedores pueden validar su identidad (DNI/RUC) para obtener ' +
          'el sello "Confiable".',
      },
    },
    {
      topic: 'referidos_y_monedas',
      content: {
        codigo: 'Cada usuario tiene un código de referido único.',
        recompensa:
          'Al aprobarse un invitado, el que invita gana 50 monedas y el ' +
          'invitado 5.',
        canje: '500 monedas = 1 mes Estándar; 1000 = 2 meses Premium.',
      },
    },
    {
      topic: 'soporte',
      content: {
        contacto:
          'Para problemas técnicos o de cuenta, usar la opción "Reportar ' +
          'problema" dentro de la app o el centro de ayuda.',
      },
    },
  ];
}
