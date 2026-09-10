import {
  auc,
  crossValidate,
  fitModel,
  fitStandardizer,
  probaRaw,
  sigmoid,
  standardizeRow,
  trainLogistic,
} from './conversion-model.math.js';

describe('conversion-model.math', () => {
  describe('sigmoid', () => {
    it('vale 0.5 en 0 y es monótona', () => {
      expect(sigmoid(0)).toBeCloseTo(0.5, 6);
      expect(sigmoid(10)).toBeGreaterThan(0.99);
      expect(sigmoid(-10)).toBeLessThan(0.01);
    });
    it('no desborda con entradas extremas', () => {
      expect(Number.isFinite(sigmoid(1000))).toBe(true);
      expect(Number.isFinite(sigmoid(-1000))).toBe(true);
    });
  });

  describe('fitStandardizer / standardizeRow', () => {
    it('centra y escala; std=0 no divide por cero', () => {
      const X = [
        [0, 5],
        [10, 5],
      ];
      const std = fitStandardizer(X);
      expect(std.means).toEqual([5, 5]);
      expect(std.stds[1]).toBe(1); // columna constante → std forzada a 1
      const z = standardizeRow([10, 5], std);
      expect(z[0]).toBeCloseTo(1, 6); // (10-5)/5
      expect(z[1]).toBe(0);
    });
  });

  describe('auc', () => {
    it('coincide con el cálculo manual (0.75)', () => {
      expect(auc([0.1, 0.4, 0.35, 0.8], [0, 0, 1, 1])).toBeCloseTo(0.75, 6);
    });
    it('devuelve 0.5 con una sola clase', () => {
      expect(auc([0.2, 0.9, 0.5], [1, 1, 1])).toBe(0.5);
    });
  });

  describe('trainLogistic + probaRaw', () => {
    it('aprende un patrón separable (x >= 0.5 → 1)', () => {
      const X: number[][] = [];
      const y: number[] = [];
      for (let i = 0; i < 40; i++) {
        const x = i / 40;
        X.push([x]);
        y.push(x >= 0.5 ? 1 : 0);
      }
      const { weights, standardizer } = fitModel(X, y);
      expect(weights.weights[0]).toBeGreaterThan(0); // correlación positiva
      expect(probaRaw([0.9], weights, standardizer)).toBeGreaterThan(0.5);
      expect(probaRaw([0.1], weights, standardizer)).toBeLessThan(0.5);
    });
  });

  describe('crossValidate', () => {
    it('reporta accuracy y AUC altos en datos separables', () => {
      const X: number[][] = [];
      const y: number[] = [];
      for (let i = 0; i < 40; i++) {
        const x = i / 40;
        X.push([x]);
        y.push(x >= 0.5 ? 1 : 0);
      }
      const m = crossValidate(X, y, 5);
      expect(m.sampleSize).toBe(40);
      expect(m.positives).toBe(20);
      expect(m.folds).toBe(5);
      expect(m.accuracy).toBeGreaterThanOrEqual(0.85);
      expect(m.auc).toBeGreaterThanOrEqual(0.9);
    });

    it('degrada a tasa base y AUC 0.5 con una sola clase', () => {
      const X = [[1], [2], [3], [4], [5]];
      const y = [1, 1, 1, 1, 1];
      const m = crossValidate(X, y, 5);
      expect(m.auc).toBe(0.5);
      expect(m.accuracy).toBe(1); // todo positivo → tasa base 100%
      expect(m.folds).toBe(0); // no se entrenó
    });

    it('no rompe con dataset diminuto', () => {
      const m = crossValidate([[1], [2]], [0, 1], 5);
      expect(m.sampleSize).toBe(2);
      expect(Number.isFinite(m.auc)).toBe(true);
    });
  });

  describe('trainLogistic degenerado', () => {
    it('con 0 filas devuelve pesos vacíos y sesgo 0', () => {
      const w = trainLogistic([], []);
      expect(w.weights).toEqual([]);
      expect(w.bias).toBe(0);
    });
  });
});
