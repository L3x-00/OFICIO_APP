import {
  ConversionModelService,
  FEATURE_NAMES,
} from './conversion-model.service.js';

function sqlText(q: any): string {
  if (!q) return '';
  if (typeof q === 'string') return q;
  if (Array.isArray(q)) return q.join(' ');
  if (Array.isArray(q.strings)) return q.strings.join(' ');
  return String(q.sql ?? q.text ?? '');
}

interface ModelData {
  model?: any[];
  training?: any[];
  providerRow?: any;
  recent?: any[];
  predCount?: number;
  rows?: any[];
}

function modelPrisma(data: ModelData = {}) {
  const $queryRaw = jest.fn((q: any) => {
    const t = sqlText(q);
    if (t.includes('FROM ai_conversion_models'))
      return Promise.resolve(data.model ?? []);
    if (
      t.includes('count(*) AS count') &&
      t.includes('ai_conversion_predictions')
    )
      return Promise.resolve([{ count: data.predCount ?? 0 }]);
    if (t.includes('FROM ai_conversion_predictions'))
      return Promise.resolve(data.recent ?? []);
    if (t.includes('ANY(')) return Promise.resolve(data.rows ?? []);
    if (t.includes('LIMIT 1'))
      return Promise.resolve(data.providerRow ? [data.providerRow] : []);
    if (t.includes('coalesce(agg.views, 0) > 0'))
      return Promise.resolve(data.training ?? []);
    return Promise.resolve([]);
  });
  const $executeRaw = jest.fn().mockResolvedValue(1);
  return { db: { $queryRaw, $executeRaw } as any, $queryRaw, $executeRaw };
}

function modelRow(overrides: Record<string, unknown> = {}) {
  return {
    version: 'lr-test',
    algorithm: 'logistic_regression',
    featureNames: [...FEATURE_NAMES],
    weights: [1, 0, 0.5, 0.5, 0, 0],
    bias: 0,
    featureMeans: [3, 1, 1, 0.5, 0.5, 0.5],
    featureStds: [1, 1, 1, 1, 1, 1],
    metrics: {
      accuracy: 0.8,
      auc: 0.7,
      folds: 5,
      sampleSize: 20,
      positives: 10,
    },
    trainedAt: new Date('2026-09-01T00:00:00Z'),
    ...overrides,
  };
}

function trainingRows(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    rating: (i % 5) + 1,
    reviews: i,
    plan: i % 3 === 0 ? 'PREMIUM' : i % 3 === 1 ? 'ESTANDAR' : 'GRATIS',
    completeness: (i % 5) / 5,
    views: 10 + i,
    // Mitad con contactos (label 1), mitad sin (label 0).
    contacts: i % 2 === 0 ? 0 : 2,
    response_rate: (i % 4) / 4,
    has_payments: i % 2,
  }));
}

describe('ConversionModelService', () => {
  describe('train', () => {
    it('no entrena con datos insuficientes', async () => {
      const { db } = modelPrisma({ training: trainingRows(3) });
      const service = new ConversionModelService(db);

      const r = await service.train();

      expect(r.trained).toBe(false);
      expect(r.reason).toMatch(/insuficientes/i);
    });

    it('entrena, calcula métricas y persiste el modelo', async () => {
      const { db, $executeRaw } = modelPrisma({ training: trainingRows(12) });
      const service = new ConversionModelService(db);

      const r = await service.train();

      expect(r.trained).toBe(true);
      expect(r.version).toMatch(/^lr-/);
      expect(r.metrics?.sampleSize).toBe(12);
      // Persistió el snapshot del modelo.
      expect($executeRaw).toHaveBeenCalledTimes(1);
      const savedSql = sqlText($executeRaw.mock.calls[0][0]);
      expect(savedSql).toContain('INSERT INTO ai_conversion_models');
    });
  });

  describe('predict', () => {
    it('devuelve probabilidad 0-100 + etiqueta y registra la predicción', async () => {
      const { db, $executeRaw } = modelPrisma({
        model: [modelRow()],
        providerRow: {
          id: 5,
          rating: 5,
          reviews: 10,
          plan: 'PREMIUM',
          completeness: 1,
          views: 20,
          contacts: 3,
          response_rate: 0.9,
          has_payments: 1,
        },
      });
      const service = new ConversionModelService(db);

      const p = await service.predict({ providerId: 5 });

      expect(p.probability).toBeGreaterThanOrEqual(0);
      expect(p.probability).toBeLessThanOrEqual(100);
      expect(['alta', 'media', 'baja']).toContain(p.label);
      expect(p.modelVersion).toBe('lr-test');
      expect(p.features?.plan).toBe('PREMIUM');
      // Registró la predicción (log).
      const logged = $executeRaw.mock.calls.some((c: any[]) =>
        sqlText(c[0]).includes('INSERT INTO ai_conversion_predictions'),
      );
      expect(logged).toBe(true);
    });

    it('sin modelo entrenable devuelve etiqueta "sin_modelo"', async () => {
      const { db } = modelPrisma({ model: [], training: [] });
      const service = new ConversionModelService(db);

      const p = await service.predict({
        features: { rating: 5, plan: 'PREMIUM' },
      });

      expect(p.label).toBe('sin_modelo');
      expect(p.modelVersion).toBeNull();
      expect(p.features?.rating).toBe(5);
    });

    it('lanza 404 si el proveedor no existe', async () => {
      const { db } = modelPrisma({ model: [modelRow()], providerRow: null });
      const service = new ConversionModelService(db);

      await expect(service.predict({ providerId: 999 })).rejects.toThrow(
        /no encontrado/i,
      );
    });
  });

  describe('estado e historial', () => {
    it('getModelStatus refleja si hay modelo', async () => {
      const withModel = new ConversionModelService(
        modelPrisma({ model: [modelRow()] }).db,
      );
      const without = new ConversionModelService(modelPrisma({ model: [] }).db);

      expect((await withModel.getModelStatus()).trained).toBe(true);
      expect((await without.getModelStatus()).trained).toBe(false);
    });

    it('recentPredictions mapea filas y normaliza providerId nulo', async () => {
      const { db } = modelPrisma({
        recent: [
          {
            id: 2,
            providerId: null,
            modelVersion: 'lr-test',
            probability: 55,
            label: 'media',
            createdAt: new Date('2026-09-02T00:00:00Z'),
          },
        ],
      });
      const service = new ConversionModelService(db);

      const rows = await service.recentPredictions(10);

      expect(rows).toHaveLength(1);
      expect(rows[0].providerId).toBeNull();
      expect(rows[0].probability).toBe(55);
    });

    it('countPredictions convierte bigint a number', async () => {
      const { db } = modelPrisma({ predCount: 7 });
      const service = new ConversionModelService(db);
      expect(await service.countPredictions()).toBe(7);
    });

    it('prunePredictions ejecuta el DELETE acotado', async () => {
      const { db, $executeRaw } = modelPrisma();
      const service = new ConversionModelService(db);

      await service.prunePredictions();

      const sql = sqlText($executeRaw.mock.calls[0][0]);
      expect(sql).toContain('DELETE FROM ai_conversion_predictions');
    });
  });

  describe('scoreProviders (Recomendado por la IA)', () => {
    const featRow = (id: number, over: Record<string, unknown> = {}) => ({
      id,
      rating: 3,
      reviews: 5,
      plan: 'GRATIS',
      completeness: 0.5,
      views: 10,
      contacts: 1,
      response_rate: 0.5,
      has_payments: 0,
      ...over,
    });

    it('ids vacíos → {} sin consultar', async () => {
      const { db, $queryRaw } = modelPrisma();
      const service = new ConversionModelService(db);
      await expect(service.scoreProviders([])).resolves.toEqual({});
      expect($queryRaw).not.toHaveBeenCalled();
    });

    it('con modelo → puntúa 0-100 los ids presentes', async () => {
      const { db } = modelPrisma({
        model: [modelRow()],
        rows: [featRow(5, { rating: 5, plan: 'PREMIUM', completeness: 1 })],
      });
      const service = new ConversionModelService(db);

      const scores = await service.scoreProviders([5, 5]); // dedup
      expect(Object.keys(scores)).toEqual(['5']);
      expect(scores[5]).toBeGreaterThanOrEqual(0);
      expect(scores[5]).toBeLessThanOrEqual(100);
    });

    it('sin modelo → heurístico: mejor perfil puntúa más alto', async () => {
      const { db } = modelPrisma({
        model: [],
        rows: [
          featRow(1, {
            rating: 5,
            completeness: 1,
            response_rate: 1,
            plan: 'PREMIUM',
            reviews: 40,
          }),
          featRow(2, {
            rating: 1,
            completeness: 0,
            response_rate: 0,
            plan: 'GRATIS',
            reviews: 0,
          }),
        ],
      });
      const service = new ConversionModelService(db);

      const scores = await service.scoreProviders([1, 2]);
      expect(scores[1]).toBeGreaterThan(scores[2]);
      expect(scores[1]).toBeLessThanOrEqual(100);
      expect(scores[2]).toBeGreaterThanOrEqual(0);
    });
  });
});
