const aiTelemetry = require('../src/services/aiTelemetry');

describe('AI Telemetry Service', () => {
  describe('validateSensorValue', () => {
    test('returns valid for good soil value', () => {
      const result = aiTelemetry.validateSensorValue('soil', 45);
      expect(result.valid).toBe(true);
      expect(result.quality).toBe('good');
    });

    test('returns invalid for out-of-range soil value', () => {
      const result = aiTelemetry.validateSensorValue('soil', 150);
      expect(result.valid).toBe(false);
      expect(result.quality).toBe('out_of_range');
    });

    test('returns invalid for negative temperature', () => {
      const result = aiTelemetry.validateSensorValue('temperature', -20);
      expect(result.valid).toBe(false);
      expect(result.quality).toBe('out_of_range');
    });

    test('returns valid for null optional sensor', () => {
      const result = aiTelemetry.validateSensorValue('soil', null);
      expect(result.valid).toBe(true);
      expect(result.quality).toBe('missing');
    });

    test('returns invalid for non-numeric value', () => {
      const result = aiTelemetry.validateSensorValue('temperature', 'hot');
      expect(result.valid).toBe(false);
      expect(result.quality).toBe('invalid');
    });

    test('returns valid for unknown sensor type', () => {
      const result = aiTelemetry.validateSensorValue('unknown_type', 50);
      expect(result.valid).toBe(true);
      expect(result.quality).toBe('unknown');
    });

    test('returns valid for boundary values', () => {
      expect(aiTelemetry.validateSensorValue('temperature', -10).valid).toBe(true);
      expect(aiTelemetry.validateSensorValue('temperature', 60).valid).toBe(true);
      expect(aiTelemetry.validateSensorValue('humidity', 0).valid).toBe(true);
      expect(aiTelemetry.validateSensorValue('humidity', 100).valid).toBe(true);
    });
  });

  describe('assessDataQuality', () => {
    test('returns score 100 for all good values', () => {
      const result = aiTelemetry.assessDataQuality({
        soil: 45, temperature: 28, humidity: 70
      });
      expect(result.score).toBe(100);
      expect(result.grade).toBe('A');
      expect(result.meetsMinimumQuality).toBe(true);
    });

    test('returns grade D for poor quality', () => {
      const result = aiTelemetry.assessDataQuality({
        soil: 999, temperature: 999, humidity: 999
      });
      expect(result.grade).toBe('D');
      expect(result.issuesCount).toBeGreaterThan(0);
      expect(result.meetsMinimumQuality).toBe(false);
    });

    test('returns grade B for mixed quality', () => {
      const result = aiTelemetry.assessDataQuality({
        soil: 45, temperature: 999, humidity: 70
      });
      expect(result.grade).toBe('B');
      expect(result.validSensors).toBeGreaterThan(0);
    });

    test('includes all required fields', () => {
      const result = aiTelemetry.assessDataQuality({ soil: 50 });
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('grade');
      expect(result).toHaveProperty('totalSensors');
      expect(result).toHaveProperty('validSensors');
      expect(result).toHaveProperty('issuesCount');
      expect(result).toHaveProperty('details');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('meetsMinimumQuality');
    });
  });

  describe('getClassification', () => {
    test('returns correct classification for known types', () => {
      expect(aiTelemetry.getClassification('sensor_reading')).toBe('Operational');
      expect(aiTelemetry.getClassification('prediction_output')).toBe('Internal');
      expect(aiTelemetry.getClassification('anomaly')).toBe('Confidential');
    });

    test('returns Unknown for unknown types', () => {
      expect(aiTelemetry.getClassification('unknown')).toBe('Unknown');
    });
  });

  describe('hashData', () => {
    test('returns consistent hash for same data', () => {
      const h1 = aiTelemetry.hashData({ a: 1, b: 2 });
      const h2 = aiTelemetry.hashData({ b: 2, a: 1 });
      expect(h1).toBe(h2);
    });

    test('returns different hash for different data', () => {
      const h1 = aiTelemetry.hashData({ a: 1 });
      const h2 = aiTelemetry.hashData({ a: 2 });
      expect(h1).not.toBe(h2);
    });

    test('returns non-null hash string', () => {
      const h = aiTelemetry.hashData({ test: 123 });
      expect(h).toBeTruthy();
      expect(typeof h).toBe('string');
    });
  });

  describe('enrichSensorData', () => {
    test('enriches data with metadata', () => {
      const enriched = aiTelemetry.enrichSensorData({ soil: 45, temperature: 28 }, 'farm-1');
      expect(enriched.soil).toBe(45);
      expect(enriched.temperature).toBe(28);
      expect(enriched._meta).toBeTruthy();
      expect(enriched._meta.farmId).toBe('farm-1');
      expect(enriched._meta.timestamp).toBeTruthy();
      expect(enriched._meta.dataClassification).toBe('Internal');
      expect(enriched._meta.quality).toHaveProperty('score');
    });
  });

  describe('logPredictionAudit', () => {
    test('creates audit entry with all fields', () => {
      const entry = aiTelemetry.logPredictionAudit({
        predictionType: 'irrigation',
        modelId: 'model-001',
        inputHash: 'abc123',
        outputHash: 'def456',
        qualityScore: 85,
        qualityGrade: 'B',
        inputSources: ['sensors:soil'],
        dataClassification: 'Internal'
      });
      expect(entry.id).toBeTruthy();
      expect(entry.timestamp).toBeTruthy();
      expect(entry.predictionType).toBe('irrigation');
      expect(entry.modelId).toBe('model-001');
    });
  });

  describe('getRecentAudit', () => {
    test('returns array', () => {
      const audit = aiTelemetry.getRecentAudit(5);
      expect(Array.isArray(audit)).toBe(true);
    });
  });

  describe('checkDataFreshness', () => {
    test('returns freshness info', () => {
      const data = {
        soil: { value: 45, timestamp: new Date().toISOString() },
        temperature: { value: 28, timestamp: new Date().toISOString() }
      };
      const result = aiTelemetry.checkDataFreshness(data, 60);
      expect(result).toHaveProperty('freshness');
      expect(result).toHaveProperty('overall');
      expect(result).toHaveProperty('maxAgeMinutes', 60);
      expect(result).toHaveProperty('timestamp');
    });
  });

  describe('getAggregatedSensors', () => {
    test('returns object with sensor types', () => {
      const result = aiTelemetry.getAggregatedSensors('default', 24);
      expect(typeof result).toBe('object');
    });
  });

  describe('getDataGovernanceReport', () => {
test('returns governance report or graceful error', () => {
      const report = aiTelemetry.getDataGovernanceReport();
      expect(report).toHaveProperty('timestamp');
      if (report.error) {
        expect(report.error).toBeTruthy();
      } else {
        expect(report).toHaveProperty('devices');
        expect(report).toHaveProperty('telemetry');
        expect(report).toHaveProperty('ai');
        expect(report).toHaveProperty('governanceStatus');
      }
    });
  });
});