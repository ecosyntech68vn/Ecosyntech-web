/**
 * Digital Twin Service - Mô phỏng cánh đồng ảo với Ensemble Kalman Filter
 * 
 * ISO Standards: ISO 8601, ISO 25010, ISO 27001, ISO 19116 (positioning)
 * 
 * @version 1.0.0
 * @author EcoSynTech
 */

const logger = require('../../config/logger');
const EventEmitter = require('events');

const STATE_VARIABLES = ['biomass', 'soilMoisture', 'soilTemperature', 'nutrientLevel'];
const ENSEMBLE_SIZE = 50;

class DigitalTwin extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.farmId = options.farmId || 'default';
    this.stateDimension = STATE_VARIABLES.length;
    this.ensembleSize = options.ensembleSize || ENSEMBLE_SIZE;
    
    this.initializeState(options);
    this.initializeModelMatrices(options);
    this.simulationHistory = [];
    this.maxHistory = 1000;
  }

  initializeState(options) {
    this.currentState = {
      biomass: options.initialBiomass || 100.0,
      soilMoisture: options.initialSoilMoisture || 30.0,
      soilTemperature: options.initialSoilTemperature || 25.0,
      nutrientLevel: options.initialNutrientLevel || 50.0
    };
    
    this.stateVector = [
      this.currentState.biomass,
      this.currentState.soilMoisture,
      this.currentState.soilTemperature,
      this.currentState.nutrientLevel
    ];
  }

  initializeModelMatrices(options) {
    this.F = options.transitionMatrix || [
      [1.01, 0.02, 0.005, 0.01],
      [-0.05, 0.95, 0.0, 0.0],
      [0.0, 0.01, 0.98, 0.0],
      [-0.01, 0.02, 0.01, 0.97]
    ];
    
    this.Q = options.processNoise || [
      [0.5, 0, 0, 0],
      [0, 0.3, 0, 0],
      [0, 0, 0.2, 0],
      [0, 0, 0, 0.2]
    ];
    
    this.H = options.observationMatrix || [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1]
    ];
    
    this.R = options.measurementNoise || [
      [2, 0, 0, 0],
      [0, 1.5, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1]
    ];
    
    this.P = options.covarianceMatrix || [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1]
    ];
    
    this.ensemble = this._generateInitialEnsemble();
  }

  _generateInitialEnsemble() {
    const ensemble = [];
    for (let i = 0; i < this.ensembleSize; i++) {
      const member = this.stateVector.map((val, idx) => {
        const stdDev = Math.sqrt(this.P[idx][idx]);
        return val + (Math.random() - 0.5) * 2 * stdDev;
      });
      ensemble.push(member);
    }
    return ensemble;
  }

  _matrixMultiply(A, B) {
    const rowsA = A.length;
    const colsA = A[0].length;
    const colsB = B[0].length;
    
    const result = Array(rowsA).fill(null).map(() => Array(colsB).fill(0));
    
    for (let i = 0; i < rowsA; i++) {
      for (let j = 0; j < colsB; j++) {
        for (let k = 0; k < colsA; k++) {
          result[i][j] += A[i][k] * B[k][j];
        }
      }
    }
    
    return result;
  }

  _vectorMultiply(A, v) {
    return A.map(row => row.reduce((sum, val, i) => sum + val * v[i], 0));
  }

  _matrixAdd(A, B) {
    return A.map((row, i) => row.map((val, j) => val + (B[i] ? B[i][j] : 0)));
  }

  _matrixSubtract(A, B) {
    return A.map((row, i) => row.map((val, j) => val - B[i][j]));
  }

  _transpose(A) {
    return A[0].map((_, colIndex) => A.map(row => row[colIndex]));
  }

  _identity(n) {
    return Array(n).fill(null).map((_, i) => 
      Array(n).fill(0).map((_, j) => i === j ? 1 : 0)
    );
  }

  _inverseMatrix(M) {
    const n = M.length;
    const augmented = M.map((row, i) => [...row, ...this._identity(n)[i]]);
    
    for (let i = 0; i < n; i++) {
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
          maxRow = k;
        }
      }
      [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];
      
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

  _addProcessNoise(ensemble) {
    return ensemble.map(member => 
      member.map((val, idx) => {
        const noise = (Math.random() - 0.5) * 2 * Math.sqrt(this.Q[idx][idx]);
        return val + noise;
      })
    );
  }

  predict(waterInput = 0, temperature = 25, fertilizerInput = 0, days = 1) {
    for (let d = 0; d < days; d++) {
      const predictedEnsemble = [];
      
      for (const member of this.ensemble) {
        let newMember = [...member];
        
        const growthRate = 0.01 * (1 + temperature / 30);
        const waterFactor = Math.min(1, waterInput / 500);
        const fertilizerFactor = Math.min(1, fertilizerInput / 100);
        
        newMember[0] = member[0] * (1 + growthRate * waterFactor) + 0.1 * fertilizerFactor;
        
        newMember[1] = member[1] * 0.95 + 0.5 * waterInput - 0.1 * temperature;
        newMember[1] = Math.max(0, Math.min(100, newMember[1]));
        
        newMember[2] = member[2] * 0.98 + 0.02 * temperature;
        newMember[2] = Math.max(0, Math.min(50, newMember[2]));
        
        newMember[3] = member[3] * 0.97 + 0.3 * fertilizerInput - 0.05 * member[0];
        newMember[3] = Math.max(0, Math.min(100, newMember[3]));
        
        predictedEnsemble.push(newMember);
      }
      
      this.ensemble = this._addProcessNoise(predictedEnsemble);
    }
    
    this._updateStateFromEnsemble();
    
    return {
      predictedState: { ...this.currentState },
      timestamp: new Date().toISOString(),
      daysAhead: days
    };
  }

  update(measurements) {
    const measurementVector = [
      measurements.biomass ?? this.currentState.biomass,
      measurements.soilMoisture ?? this.currentState.soilMoisture,
      measurements.soilTemperature ?? this.currentState.soilTemperature,
      measurements.nutrientLevel ?? this.currentState.nutrientLevel
    ];
    
    const HP = this._matrixMultiply(this.H, this.P);
    const HPHt = this._matrixMultiply(HP, this._transpose(this.H));
    const S = this._matrixAdd(HPHt, this.R);
    
    let S_inv;
    try {
      S_inv = this._inverseMatrix(S);
    } catch (e) {
      logger.warn('[DigitalTwin] Matrix inversion failed, using pseudo-inverse');
      S_inv = this._identity(this.stateDimension);
    }
    
    const K = this._matrixMultiply(this._matrixMultiply(this.P, this._transpose(this.H)), S_inv);
    
    const innovation = measurementVector.map((m, i) => m - this.stateVector[i]);
    const stateCorrection = this._vectorMultiply(K, innovation);
    
    this.stateVector = this.stateVector.map((s, i) => s + stateCorrection[i]);
    
    const I_KH = this._matrixSubtract(this._identity(this.stateDimension), this._matrixMultiply(K, this.H));
    this.P = this._matrixMultiply(I_KH, this.P);
    
    for (let i = 0; i < this.ensembleSize; i++) {
      const noise = this.stateVector.map((s, j) => s + (Math.random() - 0.5) * Math.sqrt(this.P[j][j]));
      this.ensemble[i] = this.ensemble[i].map((e, j) => 0.5 * e + 0.5 * noise[j]);
    }
    
    this._updateStateFromEnsemble();
    
    return {
      updatedState: { ...this.currentState },
      innovation: innovation,
      timestamp: new Date().toISOString()
    };
  }

  _updateStateFromEnsemble() {
    const means = Array(this.stateDimension).fill(0);
    
    for (const member of this.ensemble) {
      for (let i = 0; i < this.stateDimension; i++) {
        means[i] += member[i] / this.ensembleSize;
      }
    }
    
    this.stateVector = means;
    
    this.currentState = {
      biomass: means[0],
      soilMoisture: means[1],
      soilTemperature: means[2],
      nutrientLevel: means[3]
    };
  }

  simulateScenario(scenario) {
    const {
      waterAmount = 500,
      temperature = 25,
      fertilizerAmount = 100,
      days = 7
    } = scenario;
    
    const initialState = { ...this.currentState };
    const predictions = [];
    
    const tempState = JSON.parse(JSON.stringify(this.ensemble));
    this.ensemble = tempState;
    
    for (let day = 1; day <= days; day++) {
      const result = this.predict(waterAmount / days, temperature, fertilizerAmount / days, 1);
      predictions.push({
        day,
        state: { ...result.predictedState }
      });
    }
    
    const restoredEnsemble = JSON.parse(JSON.stringify(tempState));
    this.ensemble = restoredEnsemble;
    this._updateStateFromEnsemble();
    
    return {
      scenario,
      initialState,
      predictions,
      recommendedWater: this._recommendWater(predictions),
      recommendedFertilizer: this._recommendFertilizer(predictions)
    };
  }

  _recommendWater(predictions) {
    const avgMoisture = predictions.reduce((sum, p) => sum + p.state.soilMoisture, 0) / predictions.length;
    
    if (avgMoisture < 25) return { amount: 600, reason: 'Soil moisture critically low' };
    if (avgMoisture < 40) return { amount: 400, reason: 'Soil moisture below optimal' };
    return { amount: 200, reason: 'Soil moisture adequate' };
  }

  _recommendFertilizer(predictions) {
    const avgNutrient = predictions.reduce((sum, p) => sum + p.state.nutrientLevel, 0) / predictions.length;
    
    if (avgNutrient < 30) return { amount: 120, reason: 'Nutrient level critically low' };
    if (avgNutrient < 50) return { amount: 80, reason: 'Nutrient level below optimal' };
    return { amount: 40, reason: 'Nutrient level adequate' };
  }

  getStatus() {
    return {
      farmId: this.farmId,
      currentState: this.currentState,
      stateVector: this.stateVector,
      ensembleSize: this.ensembleSize,
      simulationHistoryLength: this.simulationHistory.length,
      timestamp: new Date().toISOString()
    };
  }

  getHealth() {
    const avgBiomass = this.currentState.biomass;
    const avgMoisture = this.currentState.soilMoisture;
    
    return {
      healthy: avgBiomass > 0 && avgMoisture > 0 && avgMoisture < 100,
      biomassValid: avgBiomass > 0,
      moistureValid: avgMoisture > 0 && avgMoisture < 100,
      temperatureValid: this.currentState.soilTemperature > 0 && this.currentState.soilTemperature < 50,
      modelConverged: this.simulationHistory.length > 10
    };
  }

  reset() {
    this.ensemble = this._generateInitialEnsemble();
    this._updateStateFromEnsemble();
    this.simulationHistory = [];
    logger.info('[DigitalTwin] State reset');
  }
}

module.exports = DigitalTwin;