import { AiInsightsService } from './ai-insights.service.js';

// ── Fakes ────────────────────────────────────────────────────────────
// El servicio se instancia directo (misma convención que
// whatsapp-operations.service.spec). Prisma se mockea enrutando cada
// $queryRaw por el TEXTO del SQL (Prisma.sql expone `.strings`), así los
// tests son independientes del orden en que se resuelven las promesas.

function sqlText(q: any): string {
  if (!q) return '';
  if (typeof q === 'string') return q;
  // Tagged template directo ($queryRaw`...`): el 1er arg es el array de
  // segmentos literales (TemplateStringsArray).
  if (Array.isArray(q)) return q.join(' ');
  if (Array.isArray(q.strings)) return q.strings.join(' ');
  return String(q.sql ?? q.text ?? '');
}

interface FakeData {
  general?: any[];
  plan?: any[];
  hour?: any[];
  response?: any[];
  scan?: any[];
  uniq?: any[];
  chatRooms?: number;
  totalProviders?: number;
  activeProviders?: number;
}

function fakePrisma(data: FakeData = {}) {
  const $queryRaw = jest.fn((q: any) => {
    const t = sqlText(q);
    if (t.includes('dup_providers'))
      return Promise.resolve(data.uniq ?? [{ total: 0, dup_providers: 0 }]);
    if (t.includes('has_desc')) return Promise.resolve(data.scan ?? []);
    if (t.includes('chat_rooms r')) return Promise.resolve(data.response ?? []);
    if (t.includes('extract(hour')) return Promise.resolve(data.hour ?? []);
    if (t.includes('GROUP BY s.plan')) return Promise.resolve(data.plan ?? []);
    if (t.includes('provider_analytics'))
      return Promise.resolve(data.general ?? [{ views: 0, contacts: 0 }]);
    return Promise.resolve([]);
  });
  return {
    $queryRaw,
    chatRoom: { count: jest.fn().mockResolvedValue(data.chatRooms ?? 0) },
    provider: {
      count: jest
        .fn()
        .mockResolvedValueOnce(data.totalProviders ?? 0)
        .mockResolvedValueOnce(data.activeProviders ?? 0),
    },
  } as any;
}

function fakeCache() {
  return {
    get: jest.fn().mockResolvedValue(undefined),
    set: jest.fn().mockResolvedValue(undefined),
  } as any;
}

function fakeModel(opts: { status?: any; count?: number } = {}) {
  return {
    getModelStatus: jest
      .fn()
      .mockResolvedValue(opts.status ?? { trained: false }),
    countPredictions: jest.fn().mockResolvedValue(opts.count ?? 0),
  } as any;
}

describe('AiInsightsService', () => {
  describe('getConversionMetrics', () => {
    it('agrega general/plan/hora/respuesta con tasas correctas', async () => {
      const db = fakePrisma({
        general: [{ views: 100, contacts: 25 }],
        plan: [
          { plan: 'PREMIUM', views: 50, contacts: 20 },
          { plan: 'GRATIS', views: 50, contacts: 5 },
        ],
        hour: [
          { hour: 10, views: 30, contacts: 12 },
          { hour: 15, views: 20, contacts: 8 },
        ],
        response: [{ plan: 'PREMIUM', total_rooms: 10, rooms_with_reply: 8 }],
        chatRooms: 12,
      });
      const service = new AiInsightsService(db, fakeCache(), fakeModel());

      const m = await service.getConversionMetrics(30);

      expect(m.general).toEqual({
        views: 100,
        contacts: 25,
        conversionRate: 25,
        chatRooms: 12,
      });
      // Orden canónico de planes: GRATIS antes que PREMIUM.
      expect(m.byPlan.map((b) => b.key)).toEqual(['GRATIS', 'PREMIUM']);
      expect(m.byPlan.find((b) => b.key === 'PREMIUM')?.conversionRate).toBe(
        40,
      );
      expect(m.byPlan.find((b) => b.key === 'GRATIS')?.conversionRate).toBe(10);
      // 24 horas siempre presentes (backfill de ceros).
      expect(m.byHour).toHaveLength(24);
      expect(m.byHour.find((h) => h.key === '10')?.conversionRate).toBe(40);
      expect(m.byHour.find((h) => h.key === '3')?.views).toBe(0);
      expect(m.responseRateByPlan[0]).toMatchObject({
        plan: 'PREMIUM',
        responseRate: 80,
      });
      expect(m.caveats).toHaveLength(2);
    });

    it('degrada a ceros si el SQL falla (no rompe el panel)', async () => {
      const db = {
        $queryRaw: jest.fn().mockRejectedValue(new Error('db down')),
        chatRoom: { count: jest.fn().mockResolvedValue(0) },
      } as any;
      const service = new AiInsightsService(db, fakeCache(), fakeModel());

      const m = await service.getConversionMetrics(30);

      expect(m.general).toEqual({
        views: 0,
        contacts: 0,
        conversionRate: 0,
        chatRooms: 0,
      });
      expect(m.byPlan).toEqual([]);
      expect(m.byHour).toHaveLength(24);
      expect(m.byHour.every((h) => h.views === 0 && h.contacts === 0)).toBe(
        true,
      );
    });

    it('clampa days fuera de rango (usa la caché por período efectivo)', async () => {
      const cache = fakeCache();
      const db = fakePrisma({ general: [{ views: 10, contacts: 1 }] });
      const service = new AiInsightsService(db, cache, fakeModel());

      await service.getConversionMetrics(9999);

      // period clampado a 365 → key de caché refleja el valor efectivo.
      expect(cache.get).toHaveBeenCalledWith('ai-insights:conversion:365');
    });
  });

  describe('getDataQuality', () => {
    it('calcula las 5 dimensiones y el promedio', async () => {
      const db = fakePrisma({
        scan: [
          {
            total: 10,
            has_desc: 8,
            has_wa: 9,
            has_addr: 5,
            has_geo: 6,
            has_social: 4,
            has_image: 7,
            has_category: 10,
            inconsistent: 1,
            invalid: 2,
            approved: 6,
          },
        ],
        uniq: [{ total: 10, dup_providers: 2 }],
      });
      const service = new AiInsightsService(db, fakeCache(), fakeModel());

      const q = await service.getDataQuality();

      expect(q.sampleSize).toBe(10);
      expect(q.completeness.score).toBe(70); // media de 8,9,5,6,4,7,10 /10
      expect(q.consistency.score).toBe(90); // (10-1)/10
      expect(q.validity.score).toBe(80); // (10-2)/10
      expect(q.uniqueness.score).toBe(80); // (10-2)/10
      expect(q.accuracy.score).toBe(60); // 6/10
      expect(q.overall).toBe(76); // (70+90+80+80+60)/5
    });

    it('devuelve ceros cuando no hay proveedores', async () => {
      const db = fakePrisma({
        scan: [
          {
            total: 0,
            has_desc: 0,
            has_wa: 0,
            has_addr: 0,
            has_geo: 0,
            has_social: 0,
            has_image: 0,
            has_category: 0,
            inconsistent: 0,
            invalid: 0,
            approved: 0,
          },
        ],
        uniq: [{ total: 0, dup_providers: 0 }],
      });
      const service = new AiInsightsService(db, fakeCache(), fakeModel());

      const q = await service.getDataQuality();

      expect(q.sampleSize).toBe(0);
      expect(q.overall).toBe(0);
    });
  });

  describe('getPatterns', () => {
    it('deriva patrones legibles de las métricas reales', async () => {
      const db = fakePrisma({
        general: [{ views: 100, contacts: 25 }],
        plan: [
          { plan: 'PREMIUM', views: 50, contacts: 20 },
          { plan: 'GRATIS', views: 50, contacts: 5 },
        ],
        hour: [
          { hour: 10, views: 30, contacts: 15 },
          { hour: 16, views: 20, contacts: 6 },
        ],
        response: [{ plan: 'PREMIUM', total_rooms: 10, rooms_with_reply: 8 }],
      });
      const service = new AiInsightsService(db, fakeCache(), fakeModel());

      const { patterns } = await service.getPatterns(30);

      expect(
        patterns.some((p) => p.includes('PREMIUM') && p.includes('40%')),
      ).toBe(true);
      expect(
        patterns.some((p) => p.includes('10:00') && p.includes('16:00')),
      ).toBe(true);
    });

    it('devuelve un mensaje de "sin datos" cuando no hay señal', async () => {
      const service = new AiInsightsService(
        fakePrisma(),
        fakeCache(),
        fakeModel(),
      );
      const { patterns } = await service.getPatterns(30);
      expect(patterns).toHaveLength(1);
      expect(patterns[0]).toMatch(/no hay suficientes datos/i);
    });
  });

  describe('getDashboard', () => {
    it('compone KPIs de conversión + calidad + conteos', async () => {
      const db = fakePrisma({
        general: [{ views: 100, contacts: 25 }],
        plan: [],
        hour: [],
        response: [],
        chatRooms: 12,
        scan: [
          {
            total: 10,
            has_desc: 8,
            has_wa: 9,
            has_addr: 5,
            has_geo: 6,
            has_social: 4,
            has_image: 7,
            has_category: 10,
            inconsistent: 1,
            invalid: 2,
            approved: 6,
          },
        ],
        uniq: [{ total: 10, dup_providers: 2 }],
        totalProviders: 20,
        activeProviders: 15,
      });
      const model = fakeModel({
        status: {
          trained: true,
          version: 'lr-test',
          metrics: {
            accuracy: 0.8,
            auc: 0.7,
            folds: 5,
            sampleSize: 20,
            positives: 10,
          },
        },
        count: 5,
      });
      const service = new AiInsightsService(db, fakeCache(), model);

      const d = await service.getDashboard(30);

      expect(d).toEqual({
        periodDays: 30,
        totalProviders: 20,
        activeProviders: 15,
        views: 100,
        contacts: 25,
        conversionRate: 25,
        chatRooms: 12,
        dataQualityScore: 76,
        modelVersion: 'lr-test',
        modelAccuracy: 0.8,
        predictionsCount: 5,
      });
    });
  });
});
