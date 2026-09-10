/**
 * Motor matemático PURO del modelo de conversión (regresión logística).
 *
 * Sin dependencias de NestJS/Prisma → 100% testeable en aislamiento y
 * determinista (no usa aleatoriedad: los folds se parten por índice). Todo
 * corre en TypeScript nativo dentro del backend — sin Python ni scikit-learn
 * (decisión del propietario: usar el stack existente).
 */

export interface Standardizer {
  means: number[];
  stds: number[];
}

export interface LogisticWeights {
  weights: number[];
  bias: number;
}

export interface TrainOptions {
  iterations: number;
  learningRate: number;
  /** Regularización L2 (weight decay) para evitar sobreajuste con pocos datos. */
  l2: number;
}

export interface CrossValMetrics {
  accuracy: number;
  auc: number;
  folds: number;
  sampleSize: number;
  positives: number;
}

export const DEFAULT_TRAIN_OPTS: TrainOptions = {
  iterations: 500,
  learningRate: 0.1,
  l2: 0.01,
};

/** Sigmoide numéricamente estable (clamp del exponente). */
export function sigmoid(z: number): number {
  if (z >= 0) {
    const e = Math.exp(-Math.min(z, 40));
    return 1 / (1 + e);
  }
  const e = Math.exp(Math.max(z, -40));
  return e / (1 + e);
}

/** Media y desviación estándar por columna. std=0 → 1 (evita dividir por 0). */
export function fitStandardizer(X: number[][]): Standardizer {
  const n = X.length;
  const d = n > 0 ? X[0].length : 0;
  const means = new Array(d).fill(0);
  const stds = new Array(d).fill(1);
  if (n === 0) return { means, stds };

  for (const row of X) {
    for (let j = 0; j < d; j++) means[j] += row[j];
  }
  for (let j = 0; j < d; j++) means[j] /= n;

  const variance = new Array(d).fill(0);
  for (const row of X) {
    for (let j = 0; j < d; j++) {
      const diff = row[j] - means[j];
      variance[j] += diff * diff;
    }
  }
  for (let j = 0; j < d; j++) {
    const sd = Math.sqrt(variance[j] / n);
    stds[j] = sd > 1e-9 ? sd : 1;
  }
  return { means, stds };
}

/** Aplica estandarización (z-score) a una fila. */
export function standardizeRow(
  row: number[],
  { means, stds }: Standardizer,
): number[] {
  return row.map((v, j) => (v - means[j]) / stds[j]);
}

function standardizeAll(X: number[][], std: Standardizer): number[][] {
  return X.map((row) => standardizeRow(row, std));
}

/**
 * Entrena regresión logística por descenso de gradiente (batch) sobre datos
 * YA estandarizados. Devuelve pesos + sesgo.
 */
export function trainLogistic(
  Xstd: number[][],
  y: number[],
  opts: TrainOptions = DEFAULT_TRAIN_OPTS,
): LogisticWeights {
  const n = Xstd.length;
  const d = n > 0 ? Xstd[0].length : 0;
  const weights = new Array(d).fill(0);
  let bias = 0;
  if (n === 0) return { weights, bias };

  for (let iter = 0; iter < opts.iterations; iter++) {
    const gradW = new Array(d).fill(0);
    let gradB = 0;
    for (let i = 0; i < n; i++) {
      let z = bias;
      for (let j = 0; j < d; j++) z += weights[j] * Xstd[i][j];
      const error = sigmoid(z) - y[i];
      for (let j = 0; j < d; j++) gradW[j] += error * Xstd[i][j];
      gradB += error;
    }
    for (let j = 0; j < d; j++) {
      // Media del gradiente + término L2 (no regulariza el sesgo).
      const g = gradW[j] / n + opts.l2 * weights[j];
      weights[j] -= opts.learningRate * g;
    }
    bias -= opts.learningRate * (gradB / n);
  }
  return { weights, bias };
}

/** Probabilidad para una fila YA estandarizada. */
export function probaStd(
  rowStd: number[],
  { weights, bias }: LogisticWeights,
): number {
  let z = bias;
  for (let j = 0; j < rowStd.length; j++) z += weights[j] * rowStd[j];
  return sigmoid(z);
}

/** Probabilidad para una fila CRUDA (estandariza y predice). */
export function probaRaw(
  rowRaw: number[],
  weights: LogisticWeights,
  std: Standardizer,
): number {
  return probaStd(standardizeRow(rowRaw, std), weights);
}

/**
 * AUC (área bajo la curva ROC) por el estadístico de Mann-Whitney con rangos
 * promediados para empates. 0.5 = azar; 1 = perfecto.
 */
export function auc(scores: number[], labels: number[]): number {
  const n = scores.length;
  const pos = labels.filter((l) => l === 1).length;
  const neg = n - pos;
  if (pos === 0 || neg === 0) return 0.5;

  const idx = Array.from({ length: n }, (_, i) => i).sort(
    (a, b) => scores[a] - scores[b],
  );
  // Rangos promediados (1-based) para empates.
  const ranks = new Array(n).fill(0);
  let i = 0;
  while (i < n) {
    let j = i;
    while (j + 1 < n && scores[idx[j + 1]] === scores[idx[i]]) j++;
    const avgRank = (i + 1 + (j + 1)) / 2;
    for (let k = i; k <= j; k++) ranks[idx[k]] = avgRank;
    i = j + 1;
  }
  let sumRankPos = 0;
  for (let k = 0; k < n; k++) if (labels[k] === 1) sumRankPos += ranks[k];
  return (sumRankPos - (pos * (pos + 1)) / 2) / (pos * neg);
}

/**
 * Validación cruzada k-fold determinista (partición por índice, sin
 * aleatoriedad). La estandarización se ajusta SOLO con el fold de entrenamiento
 * (sin fuga de datos). Devuelve accuracy@0.5 y AUC sobre las predicciones
 * fuera-de-fold agregadas.
 *
 * Casos borde: <2 clases o muy pocas filas → devuelve la tasa base y AUC 0.5.
 */
export function crossValidate(
  Xraw: number[][],
  y: number[],
  k: number,
  opts: TrainOptions = DEFAULT_TRAIN_OPTS,
): CrossValMetrics {
  const n = Xraw.length;
  const positives = y.filter((v) => v === 1).length;
  const base: CrossValMetrics = {
    accuracy:
      n > 0
        ? Math.round((Math.max(positives, n - positives) / n) * 100) / 100
        : 0,
    auc: 0.5,
    folds: 0,
    sampleSize: n,
    positives,
  };
  // Necesitamos ambas clases y suficientes filas para partir en k folds.
  const effectiveK = Math.max(2, Math.min(k, n));
  if (n < 4 || positives === 0 || positives === n) return base;

  const oofScores = new Array(n).fill(0.5);
  for (let fold = 0; fold < effectiveK; fold++) {
    const trainX: number[][] = [];
    const trainY: number[] = [];
    const testIdx: number[] = [];
    for (let i = 0; i < n; i++) {
      if (i % effectiveK === fold) testIdx.push(i);
      else {
        trainX.push(Xraw[i]);
        trainY.push(y[i]);
      }
    }
    // Fold de entrenamiento degenerado (una sola clase) → deja 0.5 en el test.
    const trainPos = trainY.filter((v) => v === 1).length;
    if (trainX.length === 0 || trainPos === 0 || trainPos === trainY.length) {
      continue;
    }
    const std = fitStandardizer(trainX);
    const model = trainLogistic(standardizeAll(trainX, std), trainY, opts);
    for (const i of testIdx) oofScores[i] = probaRaw(Xraw[i], model, std);
  }

  let correct = 0;
  for (let i = 0; i < n; i++) {
    const pred = oofScores[i] >= 0.5 ? 1 : 0;
    if (pred === y[i]) correct++;
  }
  return {
    accuracy: Math.round((correct / n) * 100) / 100,
    auc: Math.round(auc(oofScores, y) * 100) / 100,
    folds: effectiveK,
    sampleSize: n,
    positives,
  };
}

/** Ajusta el modelo final sobre TODOS los datos (estandarizador incluido). */
export function fitModel(
  Xraw: number[][],
  y: number[],
  opts: TrainOptions = DEFAULT_TRAIN_OPTS,
): { weights: LogisticWeights; standardizer: Standardizer } {
  const standardizer = fitStandardizer(Xraw);
  const weights = trainLogistic(standardizeAll(Xraw, standardizer), y, opts);
  return { weights, standardizer };
}
