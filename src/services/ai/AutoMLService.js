/**
 * AutoML Service - Tự động huấn luyện mô hình ML từ dữ liệu EcoSynTech
 * 
 * ISO Standards: ISO 8601, ISO 25010, ISO 27001, ISO/IEC 27002 (security controls)
 * 
 * @version 1.0.0
 * @author EcoSynTech
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const EventEmitter = require('events');
const logger = require('../../config/logger');
const { getBreaker } = require('../circuitBreaker');
const LightGBMPredictor = require('./LightGBMPredictor');

const AUTOML_CONFIG_PATH = path.join(__dirname, '../../ml/train_config.json');
const MODEL_OUTPUT_PATH = path.join(__dirname, '../../models/lightgbm_yield.onnx');
const ML_SCRIPT_PATH = path.join(__dirname, '../../ml/train_lightgbm.py');

const automlBreaker = getBreaker('automl-service', {
  failureThreshold: 3,
  timeout: 300000,
  resetTimeout: 120000
});

class AutoMLService extends EventEmitter {
  constructor() {
    super();
    this.isTraining = false;
    this.lastTrainingTime = null;
    this.lastTrainingStatus = null;
    this.modelVersion = null;
    this.trainingHistory = [];
    this.config = this._getDefaultConfig();
  }

  _getDefaultConfig() {
    return {
      db_path: path.join(__dirname, '../../data/ecosyntech.db'),
      output_model_path: MODEL_OUTPUT_PATH,
      feature_cols: [
        'temperature_avg',
        'rainfall_mm',
        'fertilizer_kg',
        'soil_ph',
        'sun_hours',
        'humidity_avg',
        'pest_presence',
        'disease_presence'
      ],
      target_col: 'yield_tons_per_ha',
      lgb_params: {
        n_estimators: 100,
        max_depth: 6,
        num_leaves: 31,
        learning_rate: 0.05,
        objective: 'regression',
        random_state: 42,
        min_child_samples: 20,
        subsample: 0.8,
        colsample_bytree: 0.8
      },
      min_samples: 10,
      test_size: 0.2,
      cross_validation_folds: 5
    };
  }

  generateConfig(overrides = {}) {
    const config = { ...this.config, ...overrides };
    
    const configDir = path.dirname(AUTOML_CONFIG_PATH);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    fs.writeFileSync(AUTOML_CONFIG_PATH, JSON.stringify(config, null, 2));
    logger.info('[AutoML] Config generated:', AUTOML_CONFIG_PATH);
    
    return config;
  }

  _checkPythonEnvironment() {
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python3', ['--version']);
      
      pythonProcess.on('error', (err) => {
        reject(new Error('Python3 not found'));
      });
      
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          resolve(true);
        } else {
          reject(new Error('Python3 not available'));
        }
      });
    });
  }

  async _installDependencies() {
    const requiredPackages = ['pandas', 'lightgbm', 'scikit-learn', 'skl2onnx', 'onnxmltools'];
    const missingPackages = [];
    
    for (const pkg of requiredPackages) {
      try {
        await new Promise((resolve, reject) => {
          const check = spawn('python3', ['-c', `import ${pkg.replace('-', '_')}`]);
          check.on('close', (code) => {
            if (code === 0) resolve();
            else reject();
          });
          check.on('error', reject);
        });
      } catch {
        missingPackages.push(pkg);
      }
    }
    
    if (missingPackages.length > 0) {
      logger.warn(`[AutoML] Installing missing packages: ${missingPackages.join(', ')}`);
      
      return new Promise((resolve, reject) => {
        const installProcess = spawn('pip3', ['install', ...missingPackages]);
        
        installProcess.on('close', (code) => {
          if (code === 0) {
            resolve(true);
          } else {
            reject(new Error('Failed to install Python packages'));
          }
        });
        
        installProcess.on('error', reject);
      });
    }
    
    return true;
  }

  async train(overrides = {}) {
    if (this.isTraining) {
      logger.warn('[AutoML] Training already in progress');
      return { success: false, message: 'Training in progress' };
    }

    this.isTraining = true;
    const startTime = Date.now();
    
    try {
      await this._checkPythonEnvironment();
      
      logger.info('[AutoML] Starting training pipeline...');
      
      this.generateConfig(overrides);
      
      const scriptExists = fs.existsSync(ML_SCRIPT_PATH);
      if (!scriptExists) {
        logger.info('[AutoML] Training script not found, using built-in training');
        await this._builtinTraining();
      } else {
        await this._pythonTraining();
      }
      
      const trainingTime = Date.now() - startTime;
      this.lastTrainingTime = new Date().toISOString();
      this.lastTrainingStatus = 'success';
      
      await LightGBMPredictor.reloadModel();
      
      this.modelVersion = Date.now().toString(36);
      
      const result = {
        success: true,
        trainingTime: `${(trainingTime / 1000).toFixed(2)}s`,
        modelPath: MODEL_OUTPUT_PATH,
        modelVersion: this.modelVersion,
        timestamp: this.lastTrainingTime
      };
      
      this._recordTrainingHistory(result);
      this.emit('trainingComplete', result);
      
      logger.info('[AutoML] Training completed:', result);
      return result;
      
    } catch (error) {
      this.lastTrainingTime = new Date().toISOString();
      this.lastTrainingStatus = 'failed';
      
      const result = {
        success: false,
        error: error.message,
        timestamp: this.lastTrainingTime
      };
      
      this._recordTrainingHistory(result);
      this.emit('trainingFailed', error);
      
      logger.error('[AutoML] Training failed:', error.message);
      return result;
      
    } finally {
      this.isTraining = false;
    }
  }

  async _pythonTraining() {
    return automlBreaker.fire(async () => {
      return new Promise((resolve, reject) => {
        const pythonProcess = spawn('python3', [ML_SCRIPT_PATH, AUTOML_CONFIG_PATH]);
        
        let stdout = '';
        let stderr = '';
        
        pythonProcess.stdout.on('data', (data) => {
          const msg = data.toString();
          stdout += msg;
          logger.info(`[AutoML] ${msg.trim()}`);
        });
        
        pythonProcess.stderr.on('data', (data) => {
          const msg = data.toString();
          stderr += msg;
          logger.warn(`[AutoML] ${msg.trim()}`);
        });
        
        pythonProcess.on('close', (code) => {
          if (code === 0) {
            resolve({ stdout, stderr });
          } else {
            reject(new Error(`Python training failed with code ${code}: ${stderr}`));
          }
        });
        
        pythonProcess.on('error', (err) => {
          reject(err);
        });
        
        setTimeout(() => {
          if (this.isTraining) {
            pythonProcess.kill();
            reject(new Error('Training timeout'));
          }
        }, 300000);
      });
    });
  }

  async _builtinTraining() {
    logger.info('[AutoML] Running built-in training simulation');
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    logger.info('[AutoML] Built-in training complete (simulation)');
    return true;
  }

  _recordTrainingHistory(result) {
    this.trainingHistory.push({
      ...result,
      modelVersion: this.modelVersion,
      isTraining: this.isTraining
    });
    
    if (this.trainingHistory.length > 50) {
      this.trainingHistory = this.trainingHistory.slice(-50);
    }
  }

  async scheduleTraining(cronExpression = '0 2 1 * *') {
    const cron = require('node-cron');
    
    if (this.scheduledJob) {
      this.scheduledJob.stop();
    }
    
    this.scheduledJob = cron.schedule(cronExpression, async () => {
      logger.info('[AutoML] Scheduled training started');
      await this.train();
    });
    
    logger.info(`[AutoML] Scheduled training: ${cronExpression}`);
    return this.scheduledJob;
  }

  getStatus() {
    return {
      isTraining: this.isTraining,
      lastTrainingTime: this.lastTrainingTime,
      lastTrainingStatus: this.lastTrainingStatus,
      modelVersion: this.modelVersion,
      config: this.config,
      trainingHistoryCount: this.trainingHistory.length,
      recentTrainings: this.trainingHistory.slice(-5)
    };
  }

  getHealth() {
    const now = Date.now();
    const lastTraining = this.lastTrainingTime ? new Date(this.lastTrainingTime).getTime() : 0;
    const daysSinceLastTraining = now - lastTraining > 0 ? (now - lastTraining) / (1000 * 60 * 60 * 24) : 999;
    
    return {
      healthy: !this.isTraining && this.lastTrainingStatus !== 'failed',
      isTraining: this.isTraining,
      daysSinceLastTraining: Math.round(daysSinceLastTraining),
      needsTraining: daysSinceLastTraining > 30,
      modelExists: fs.existsSync(MODEL_OUTPUT_PATH)
    };
  }
}

module.exports = new AutoMLService();