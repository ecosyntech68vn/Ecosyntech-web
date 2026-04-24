/**
 * AI Services Tests - Test các module AI mới
 * 
 * ISO Standards: ISO 25010, ISO 27001
 * 
 * @version 1.0.0
 */

describe('LightGBMPredictor', () => {
  let LightGBMPredictor;

  beforeAll(() => {
    LightGBMPredictor = require('../src/services/ai/LightGBMPredictor');
  });

  test('should initialize without errors', async () => {
    await LightGBMPredictor.initialize();
    const status = LightGBMPredictor.getStatus();
    expect(status.initialized).toBe(true);
  });

  test('should predict using fallback when model not available', async () => {
    const features = {
      temperature_avg: 28,
      rainfall_mm: 50,
      fertilizer_kg: 100,
      soil_ph: 6.5,
      sun_hours: 8,
      humidity_avg: 70,
      pest_presence: 0.1,
      disease_presence: 0.05
    };
    
    const prediction = await LightGBMPredictor.predict(features);
    expect(prediction).toBeGreaterThan(0);
    expect(prediction).toBeLessThan(50);
  });

  test('should validate input features', async () => {
    const invalidFeatures = {
      temperature_avg: 'invalid',
      rainfall_mm: null,
      fertilizer_kg: undefined
    };
    
    const prediction = await LightGBMPredictor.predict(invalidFeatures);
    expect(typeof prediction).toBe('number');
  });

  test('should normalize extreme values', async () => {
    const extremeFeatures = {
      temperature_avg: 100,
      rainfall_mm: 5000,
      fertilizer_kg: 10000,
      soil_ph: 2,
      sun_hours: 20,
      humidity_avg: 150,
      pest_presence: 5,
      disease_presence: 5
    };
    
    const prediction = await LightGBMPredictor.predict(extremeFeatures);
    expect(prediction).toBeGreaterThan(0);
  });

  test('should provide health status', async () => {
    const health = LightGBMPredictor.getHealth();
    expect(health).toHaveProperty('healthy');
    expect(health).toHaveProperty('modelAvailable');
  });
});

describe('BayesianOptimizer', () => {
  let BayesianOptimizer;

  beforeEach(() => {
    BayesianOptimizer = require('../src/services/ai/BayesianOptimizer');
  });

  test('should initialize with default bounds', () => {
    const optimizer = new BayesianOptimizer();
    const status = optimizer.getStatus();
    expect(status.paramNames).toContain('water_amount');
    expect(status.paramNames).toContain('fertilizer_kg');
  });

  test('should optimize simple objective function', async () => {
    const optimizer = new BayesianOptimizer({ iterations: 5 });
    
    const objectiveFunction = async (params) => {
      return 10 - Math.abs(params.water_amount - 500) / 100;
    };
    
    const result = await optimizer.optimize(objectiveFunction, 3);
    expect(result).toHaveProperty('bestParams');
    expect(result).toHaveProperty('bestScore');
  });

  test('should handle optimization constraints', async () => {
    const optimizer = new BayesianOptimizer();
    
    const objective = async (params) => params.water_amount + params.fertilizer_kg;
    const constraints = {
      water_amount: (v) => v >= 300 && v <= 800,
      fertilizer_kg: (v) => v >= 50 && v <= 150
    };
    
    const result = await optimizer.optimizeWithConstraints(objective, constraints, 3);
    expect(result).toHaveProperty('bestParams');
    expect(result).toHaveProperty('bestScore');
  });

  test('should provide recommendations', () => {
    const optimizer = new BayesianOptimizer();
    optimizer.bestParams = { water_amount: 500, fertilizer_kg: 100 };
    optimizer.bestScore = 8.5;
    
    const recommendations = optimizer.getRecommendations();
    expect(recommendations).toHaveProperty('recommendations');
  });
});

describe('DigitalTwin', () => {
  let DigitalTwin;

  beforeAll(() => {
    DigitalTwin = require('../src/services/ai/DigitalTwin');
  });

  test('should initialize with default state', () => {
    const twin = new DigitalTwin();
    const status = twin.getStatus();
    expect(status.currentState).toHaveProperty('biomass');
    expect(status.currentState).toHaveProperty('soilMoisture');
  });

  test('should predict future state', () => {
    const twin = new DigitalTwin();
    const result = twin.predict(400, 27, 80, 1);
    
    expect(result).toHaveProperty('predictedState');
    expect(result).toHaveProperty('daysAhead');
  });

  test('should update with measurements', () => {
    const twin = new DigitalTwin();
    
    const measurements = {
      biomass: 150,
      soilMoisture: 35,
      soilTemperature: 26,
      nutrientLevel: 45
    };
    
    const result = twin.update(measurements);
    expect(result).toHaveProperty('updatedState');
  });

  test('should simulate scenarios', () => {
    const twin = new DigitalTwin();
    
    const scenario = {
      waterAmount: 500,
      temperature: 28,
      fertilizerAmount: 100,
      days: 7
    };
    
    const result = twin.simulateScenario(scenario);
    expect(result).toHaveProperty('predictions');
    expect(result.predictions.length).toBe(7);
  });

  test('should provide health status', () => {
    const twin = new DigitalTwin();
    const health = twin.getHealth();
    expect(health).toHaveProperty('healthy');
  });
});

describe('AutoMLService', () => {
  let AutoMLService;

  beforeAll(() => {
    AutoMLService = require('../src/services/ai/AutoMLService');
  });

  test('should provide service status', () => {
    const status = AutoMLService.getStatus();
    expect(status).toHaveProperty('isTraining');
    expect(status).toHaveProperty('config');
  });

  test('should generate config', () => {
    const config = AutoMLService.generateConfig();
    expect(config).toHaveProperty('feature_cols');
    expect(config).toHaveProperty('lgb_params');
  });

  test('should check health status', () => {
    const health = AutoMLService.getHealth();
    expect(health).toHaveProperty('healthy');
  });
});

describe('FederatedClient', () => {
  let FederatedClient;

  beforeAll(() => {
    FederatedClient = require('../src/services/ai/FederatedClient');
  });

  test('should initialize with default settings', () => {
    const client = new FederatedClient();
    const status = client.getStatus();
    expect(status).toHaveProperty('clientId');
    expect(status).toHaveProperty('serverUrl');
  });

  test('should provide health status', () => {
    const client = new FederatedClient();
    const health = client.getHealth();
    expect(health).toHaveProperty('healthy');
    expect(health).toHaveProperty('pendingQueue');
  });
});