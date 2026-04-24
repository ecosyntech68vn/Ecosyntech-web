/**
 * ML Jobs - Cron jobs cho Machine Learning tasks
 * 
 * ISO Standards: ISO 8601, ISO 25010, ISO 27001
 * 
 * @version 1.0.0
 * @author EcoSynTech
 */

const cron = require('node-cron');
const logger = require('../../config/logger');

const LightGBMPredictor = require('../services/ai/LightGBMPredictor');
const AutoMLService = require('../services/ai/AutoMLService');
const BayesianOptimizer = require('../services/ai/BayesianOptimizer');
const DigitalTwin = require('../services/ai/DigitalTwin');

class MLJobs {
  constructor() {
    this.jobs = {};
    this.digitalTwin = null;
    this.bayesianOptimizer = null;
  }

  initialize() {
    logger.info('[MLJobs] Initializing ML cron jobs...');
    
    this.startYieldPredictionJob();
    this.startAutoMLJob();
    this.startDigitalTwinSyncJob();
    this.startModelHealthCheckJob();
    
    logger.info('[MLJobs] All ML jobs initialized');
  }

  startYieldPredictionJob() {
    this.jobs.yieldPrediction = cron.schedule('0 6 * * 1', async () => {
      logger.info('[MLJobs] Running weekly yield prediction...');
      
      try {
        const sampleFeatures = {
          temperature_avg: 28,
          rainfall_mm: 50,
          fertilizer_kg: 100,
          soil_ph: 6.5,
          sun_hours: 8,
          humidity_avg: 70,
          pest_presence: 0.1,
          disease_presence: 0.05
        };
        
        const prediction = await LightGBMPredictor.predict(sampleFeatures);
        
        logger.info(`[MLJobs] Yield prediction: ${prediction} tons/ha`);
        
      } catch (error) {
        logger.error('[MLJobs] Yield prediction failed:', error.message);
      }
    });
    
    logger.info('[MLJobs] Yield prediction job scheduled: 6:00 AM every Monday');
  }

  startAutoMLJob() {
    this.jobs.autoML = cron.schedule('0 2 1 * *', async () => {
      logger.info('[MLJobs] Starting monthly AutoML training...');
      
      try {
        const result = await AutoMLService.train();
        
        if (result.success) {
          logger.info(`[MLJobs] AutoML completed: ${result.modelPath}`);
        } else {
          logger.warn(`[MLJobs] AutoML failed: ${result.error}`);
        }
        
      } catch (error) {
        logger.error('[MLJobs] AutoML job failed:', error.message);
      }
    });
    
    logger.info('[MLJobs] AutoML job scheduled: 2:00 AM on 1st of each month');
  }

  startDigitalTwinSyncJob() {
    this.jobs.digitalTwinSync = cron.schedule('*/15 * * * *', async () => {
      if (!this.digitalTwin) {
        this.digitalTwin = new DigitalTwin({ farmId: 'default' });
      }
      
      try {
        const mockMeasurements = {
          biomass: 150 + Math.random() * 10,
          soilMoisture: 35 + Math.random() * 5,
          soilTemperature: 26 + Math.random() * 2,
          nutrientLevel: 45 + Math.random() * 10
        };
        
        this.digitalTwin.update(mockMeasurements);
        
        const prediction = this.digitalTwin.predict(400, 27, 80, 1);
        
      } catch (error) {
        logger.error('[MLJobs] Digital Twin sync failed:', error.message);
      }
    });
    
    logger.info('[MLJobs] Digital Twin sync job scheduled: every 15 minutes');
  }

  startModelHealthCheckJob() {
    this.jobs.healthCheck = cron.schedule('0 0 * * *', async () => {
      logger.info('[MLJobs] Running daily ML health check...');
      
      const lgbmHealth = LightGBMPredictor.getHealth();
      const automlHealth = AutoMLService.getHealth();
      
      logger.info(`[MLJobs] LightGBM health: ${JSON.stringify(lgbmHealth)}`);
      logger.info(`[MLJobs] AutoML health: ${JSON.stringify(automlHealth)}`);
      
      if (automlHealth.needsTraining) {
        logger.warn('[MLJobs] Model needs retraining');
      }
    });
    
    logger.info('[MLJobs] Health check job scheduled: daily at midnight');
  }

  async runYieldPredictionNow(features) {
    return await LightGBMPredictor.predict(features);
  }

  async runAutoMLNow() {
    return await AutoMLService.train();
  }

  async runScenarioSimulation(scenario) {
    if (!this.digitalTwin) {
      this.digitalTwin = new DigitalTwin({ farmId: 'default' });
    }
    
    return this.digitalTwin.simulateScenario(scenario);
  }

  async runOptimization(objectiveFunction, iterations = 10) {
    this.bayesianOptimizer = new BayesianOptimizer();
    return await this.bayesianOptimizer.optimize(objectiveFunction, iterations);
  }

  stopAll() {
    for (const [name, job] of Object.entries(this.jobs)) {
      if (job) {
        job.stop();
        logger.info(`[MLJobs] Stopped job: ${name}`);
      }
    }
    this.jobs = {};
  }

  getStatus() {
    return {
      jobs: Object.keys(this.jobs),
      digitalTwinActive: this.digitalTwin !== null,
      bayesianOptimizerActive: this.bayesianOptimizer !== null,
      lightgbm: LightGBMPredictor.getStatus(),
      automl: AutoMLService.getStatus()
    };
  }
}

module.exports = new MLJobs();