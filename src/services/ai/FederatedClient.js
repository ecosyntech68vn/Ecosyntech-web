/**
 * Federated Learning Client - Gửi gradients lên server tổng hợp
 * 
 * ISO Standards: ISO 27001, ISO/IEC 27002 (A.13 - Communications security)
 * 
 * @version 1.0.0
 * @author EcoSynTech
 */

const axios = require('axios');
const logger = require('../../config/logger');
const { getBreaker } = require('../circuitBreaker');

const DEFAULT_SERVER_URL = process.env.FEDERATED_SERVER_URL || 'http://localhost:5050';
const CLIENT_ID = process.env.FARM_CLIENT_ID || `farm_${Date.now()}`;

const federatedBreaker = getBreaker('federated-client', {
  failureThreshold: 5,
  timeout: 60000,
  resetTimeout: 120000
});

class FederatedClient {
  constructor(options = {}) {
    this.serverUrl = options.serverUrl || DEFAULT_SERVER_URL;
    this.clientId = options.clientId || CLIENT_ID;
    this.isConnected = false;
    this.pendingUpdates = [];
    this.lastSyncTime = null;
    this.globalModel = null;
    this.localModelVersion = null;
    this.aggregationRound = 0;
  }

  async checkConnection() {
    try {
      const response = await axios.get(`${this.serverUrl}/health`, { timeout: 5000 });
      this.isConnected = response.data.status === 'ok';
      return this.isConnected;
    } catch (error) {
      this.isConnected = false;
      logger.warn('[Federated] Server not reachable:', error.message);
      return false;
    }
  }

  async submitGradients(localModelParams) {
    if (!this.isConnected) {
      const connected = await this.checkConnection();
      if (!connected) {
        this.pendingUpdates.push({ params: localModelParams, timestamp: Date.now() });
        logger.warn('[Federated] Queued gradient update (server offline)');
        return { success: false, queued: true, message: 'Server offline, update queued' };
      }
    }

    return federatedBreaker.fire(async () => {
      try {
        const response = await axios.post(
          `${this.serverUrl}/submit_gradient`,
          {
            client_id: this.clientId,
            client_version: this.localModelVersion,
            gradients: localModelParams,
            timestamp: new Date().toISOString(),
            sample_count: localModelParams.sampleCount || 100
          },
          { timeout: 30000 }
        );

        logger.info('[Federated] Gradients submitted successfully');
        return { success: true, data: response.data };
        
      } catch (error) {
        this.pendingUpdates.push({ params: localModelParams, timestamp: Date.now() });
        logger.error('[Federated] Submit failed:', error.message);
        return { success: false, error: error.message };
      }
    });
  }

  async submitModelUpdate(modelParams) {
    const modelUpdate = {
      client_id: this.clientId,
      model_params: modelParams,
      version: Date.now().toString(36),
      timestamp: new Date().toISOString(),
      features: ['temperature', 'rainfall', 'fertilizer', 'soil_ph', 'sun_hours', 'humidity', 'pest', 'disease'],
      metrics: {
        local_accuracy: modelParams.localAccuracy || 0.85,
        sample_count: modelParams.sampleCount || 100
      }
    };

    return this.submitGradients(modelUpdate);
  }

  async requestAggregation() {
    if (!this.isConnected) {
      await this.checkConnection();
      if (!this.isConnected) {
        return { success: false, message: 'Server not available' };
      }
    }

    try {
      const response = await axios.post(
        `${this.serverUrl}/aggregate`,
        { requesting_client: this.clientId },
        { timeout: 60000 }
      );

      this.globalModel = response.data.global_model;
      this.aggregationRound = response.data.round || this.aggregationRound + 1;
      this.lastSyncTime = new Date().toISOString();

      logger.info(`[Federated] Received global model, round: ${this.aggregationRound}`);
      return {
        success: true,
        globalModel: this.globalModel,
        round: this.aggregationRound,
        timestamp: this.lastSyncTime
      };
      
    } catch (error) {
      logger.error('[Federated] Aggregation request failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async syncPendingUpdates() {
    if (this.pendingUpdates.length === 0) {
      return { success: true, synced: 0 };
    }

    let synced = 0;
    const remaining = [];

    for (const update of this.pendingUpdates) {
      const result = await this.submitGradients(update.params);
      if (result.success) {
        synced++;
      } else {
        remaining.push(update);
      }
    }

    this.pendingUpdates = remaining;
    this.lastSyncTime = new Date().toISOString();

    logger.info(`[Federated] Synced ${synced}/${synced + remaining.length} pending updates`);
    return { success: true, synced, remaining: remaining.length };
  }

  getStatus() {
    return {
      clientId: this.clientId,
      serverUrl: this.serverUrl,
      isConnected: this.isConnected,
      lastSyncTime: this.lastSyncTime,
      pendingUpdates: this.pendingUpdates.length,
      aggregationRound: this.aggregationRound,
      hasGlobalModel: this.globalModel !== null,
      localModelVersion: this.localModelVersion
    };
  }

  getHealth() {
    return {
      healthy: this.isConnected || this.pendingUpdates.length < 10,
      connected: this.isConnected,
      pendingQueue: this.pendingUpdates.length,
      needsSync: this.pendingUpdates.length > 0
    };
  }
}

module.exports = FederatedClient;