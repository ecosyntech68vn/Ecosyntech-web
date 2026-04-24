/**
 * Bayesian Optimizer Service - Tự động tìm thông số canh tác tối ưu
 * 
 * Sử dụng Gaussian Process để tối ưu hóa tham số canh tác
 * ISO Standards: ISO 8601, ISO 25010, ISO 27001
 * 
 * @version 1.0.0
 * @author EcoSynTech
 */

const logger = require('../../config/logger');
const { getBreaker } = require('../circuitBreaker');

const bayesianBreaker = getBreaker('bayesian-optimizer', {
  failureThreshold: 5,
  timeout: 120000,
  resetTimeout: 60000
});

const DEFAULT_BOUNDS = {
  water_amount: { min: 300, max: 800 },
  fertilizer_kg: { min: 50, max: 150 },
  temperature_optimal: { min: 20, max: 35 },
  humidity_optimal: { min: 60, max: 85 },
  sun_hours_daily: { min: 6, max: 12 }
};

class BayesianOptimizer {
  constructor(options = {}) {
    this.bounds = options.bounds || DEFAULT_BOUNDS;
    this.exploration = options.exploration || 0.1;
    this.iterations = options.iterations || 10;
    this.observations = [];
    this.bestParams = null;
    this.bestScore = -Infinity;
    this.isOptimizing = false;
    this.paramNames = Object.keys(this.bounds);
    this.gpModel = this._initGaussianProcess();
  }

  _initGaussianProcess() {
    return {
      kernel: 'rbf',
      noise: 0.01,
      lengthScale: 1.0,
      variance: 1.0,
      observations: []
    };
  }

  _normalizeParam(name, value) {
    const bounds = this.bounds[name];
    if (!bounds) return value;
    return (value - bounds.min) / (bounds.max - bounds.min);
  }

  _denormalizeParam(name, normalizedValue) {
    const bounds = this.bounds[name];
    if (!bounds) return normalizedValue;
    return normalizedValue * (bounds.max - bounds.min) + bounds.min;
  }

  _rbfKernel(x1, x2, lengthScale = 1.0) {
    let distance = 0;
    for (let i = 0; i < x1.length; i++) {
      distance += Math.pow(x1[i] - x2[i], 2);
    }
    return Math.exp(-distance / (2 * lengthScale * lengthScale));
  }

  _computeKernelMatrix(X, lengthScale = 1.0) {
    const n = X.length;
    const K = Array(n).fill(null).map(() => Array(n).fill(0));
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        K[i][j] = this._rbfKernel(X[i], X[j], lengthScale);
        if (i === j) {
          K[i][j] += this.gpModel.noise * this.gpModel.noise;
        }
      }
    }
    
    return K;
  }

  _computeKStar(X, xNew, lengthScale = 1.0) {
    const n = X.length;
    const kStar = Array(n).fill(0);
    
    for (let i = 0; i < n; i++) {
      kStar[i] = this._rbfKernel(X[i], xNew, lengthScale);
    }
    
    return kStar;
  }

  _matrixMultiplyVector(M, v) {
    const n = M.length;
    const result = Array(n).fill(0);
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        result[i] += M[i][j] * v[j];
      }
    }
    
    return result;
  }

  _inverseMatrix(M) {
    const n = M.length;
    const augmented = M.map((row, i) => [...row, ...Array(n).fill(0).map((_, j) => i === j ? 1 : 0)]);
    
    for (let i = 0; i < n; i++) {
      const pivot = augmented[i][i];
      if (Math.abs(pivot) < 1e-10) continue;
      
      for (let j = 0; j < 2 * n; j++) {
        augmented[i][j] /= pivot;
      }
      
      for (let k = 0; k < n; k++) {
        if (k !== i) {
          const factor = augmented[k][i];
          for (let j = 0; j < 2 * n; j++) {
            augmented[k][j] -= factor * augmented[i][j];
          }
        }
      }
    }
    
    return augmented.map(row => row.slice(n));
  }

  _predict(xNew) {
    const X = this.gpModel.observations.map(o => o.input);
    const Y = this.gpModel.observations.map(o => o.output);
    
    if (X.length === 0) {
      return { mean: this._randomPoint(), variance: 1.0 };
    }
    
    if (X.length === 1) {
      const mean = Y[0];
      const variance = this.gpModel.variance;
      return { mean, variance };
    }
    
    try {
      const K = this._computeKernelMatrix(X, this.gpModel.lengthScale);
      const KInv = this._inverseMatrix(K);
      const kStar = this._computeKStar(X, xNew, this.gpModel.lengthScale);
      
      const alpha = this._matrixMultiplyVector(KInv, Y);
      const mean = kStar.reduce((sum, k, i) => sum + k * alpha[i], 0);
      
      const kStarStar = this._rbfKernel(xNew, xNew, this.gpModel.lengthScale);
      const kStarKInv = this._matrixMultiplyVector(KInv, kStar);
      const variance = kStarStar - kStar.reduce((sum, k, i) => sum + k * kStarKInv[i], 0);
      
      return {
        mean: isNaN(mean) ? this._randomPoint() : mean,
        variance: isNaN(variance) || variance < 0 ? 0.1 : variance
      };
    } catch (error) {
      logger.warn('[Bayesian] GP prediction failed, using random point');
      return { mean: this._randomPoint(), variance: 1.0 };
    }
  }

  _upperConfidenceBound(mean, variance, exploration = 0.1) {
    return mean + exploration * Math.sqrt(Math.log(this.observations.length + 1) * 2) * Math.sqrt(variance);
  }

  _randomPoint() {
    const randomIndex = Math.floor(Math.random() * this.paramNames.length);
    return randomIndex / this.paramNames.length;
  }

  _sampleNextPoint() {
    if (this.gpModel.observations.length < this.iterations / 2) {
      return this._randomPoint();
    }
    
    let bestUCB = -Infinity;
    let bestPoint = null;
    
    const candidates = 100;
    for (let i = 0; i < candidates; i++) {
      const point = Array(this.paramNames.length).fill(0).map(() => Math.random());
      const { mean, variance } = this._predict(point);
      const ucb = this._upperConfidenceBound(mean, variance, this.exploration);
      
      if (ucb > bestUCB) {
        bestUCB = ucb;
        bestPoint = point;
      }
    }
    
    return bestPoint || this._randomPoint();
  }

  async step(objectiveFunction) {
    const xNormalized = this._sampleNextPoint();
    const params = {};
    this.paramNames.forEach((name, i) => {
      params[name] = this._denormalizeParam(name, xNormalized[i]);
    });

    try {
      const score = await objectiveFunction(params);
      
      this.gpModel.observations.push({
        input: xNormalized,
        output: score
      });
      
      this.observations.push({
        params: { ...params },
        score,
        timestamp: new Date().toISOString()
      });

      if (score > this.bestScore) {
        this.bestScore = score;
        this.bestParams = { ...params };
      }

      logger.info(`[Bayesian] Params: ${JSON.stringify(params)}, Score: ${score.toFixed(4)}`);
      
      return { params, score, bestParams: this.bestParams, bestScore: this.bestScore };
      
    } catch (error) {
      logger.error('[Bayesian] Objective function failed:', error.message);
      throw error;
    }
  }

  async optimize(objectiveFunction, iterations = null) {
    this.isOptimizing = true;
    const maxIterations = iterations || this.iterations;
    
    try {
      for (let i = 0; i < maxIterations; i++) {
        await this.step(objectiveFunction);
      }
      
      return {
        bestParams: this.bestParams,
        bestScore: this.bestScore,
        totalIterations: this.observations.length,
        observations: this.observations
      };
      
    } finally {
      this.isOptimizing = false;
    }
  }

  async optimizeWithConstraints(objectiveFunction, constraints, iterations = null) {
    const constrainedObjective = async (params) => {
      for (const [paramName, checkFn] of Object.entries(constraints)) {
        if (!checkFn(params[paramName])) {
          return -1000;
        }
      }
      return await objectiveFunction(params);
    };
    
    return this.optimize(constrainedObjective, iterations);
  }

  getStatus() {
    return {
      isOptimizing: this.isOptimizing,
      bestParams: this.bestParams,
      bestScore: this.bestScore,
      totalObservations: this.observations.length,
      paramNames: this.paramNames,
      bounds: this.bounds,
      exploration: this.exploration
    };
  }

  getRecommendations() {
    if (!this.bestParams) {
      return { message: 'No optimization data available' };
    }
    
    const recommendations = [];
    for (const [param, value] of Object.entries(this.bestParams)) {
      const bounds = this.bounds[param];
      if (bounds) {
        recommendations.push({
          parameter: param,
          optimalValue: Math.round(value * 10) / 10,
          unit: this._getUnit(param),
          range: bounds,
          percentage: ((value - bounds.min) / (bounds.max - bounds.min) * 100).toFixed(1) + '%'
        });
      }
    }
    
    return {
      recommendations,
      expectedYield: this.bestScore.toFixed(2),
      confidence: this._computeConfidence()
    };
  }

  _getUnit(param) {
    const units = {
      water_amount: 'm³/ha',
      fertilizer_kg: 'kg/ha',
      temperature_optimal: '°C',
      humidity_optimal: '%',
      sun_hours_daily: 'hours'
    };
    return units[param] || '';
  }

  _computeConfidence() {
    if (this.observations.length < 5) return 'low';
    if (this.observations.length < 10) return 'medium';
    return 'high';
  }

  reset() {
    this.observations = [];
    this.bestParams = null;
    this.bestScore = -Infinity;
    this.gpModel = this._initGaussianProcess();
    logger.info('[Bayesian] Optimizer reset');
  }
}

module.exports = BayesianOptimizer;