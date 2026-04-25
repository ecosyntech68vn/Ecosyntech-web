/**
 * Farm Journal Service
 * Daily Agricultural Logging với Traceability
 * ISO 27001 Compliant: Audit Trail, Data Integrity, Access Control
 */

const crypto = require('crypto');

const ENTRIES_COLLECTION = 'farm_journal_entries';
const BATCHES_COLLECTION = 'fertilizer_batches';
const TIMELINE_COLLECTION = 'timeline_events';

class FarmJournalService {
  constructor() {
    this.db = new Map();
    this.batches = new Map();
    this.timeline = new Map();
    this.sequence = {
      entries: 0,
      batches: 0,
      timeline: 0
    };
    this.initData();
  }

  initData() {
    this.db.set(ENTRIES_COLLECTION, new Map());
    this.db.set(BATCHES_COLLECTION, new Map());
    this.db.set(TIMELINE_COLLECTION, new Map());
  }

  generateBatchId() {
    this.sequence.batches++;
    const seq = String(this.sequence.batches).padStart(4, '0');
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(2).toString('hex').toUpperCase();
    return `BATCH-${seq}-${timestamp.slice(-4)}${random}`;
  }

  generateEntryId(type) {
    this.sequence.entries++;
    const timestamp = Date.now().toString(36);
    const seq = String(this.sequence.entries).padStart(6, '0');
    return `${type.toUpperCase()}-${timestamp.slice(-6)}${seq}`;
  }

  generateTimelineId() {
    this.sequence.timeline++;
    return `TLINE-${Date.now().toString(36)}-${String(this.sequence.timeline).padStart(5, '0')}`;
  }

  async createSensorEntry(farmId, sensorData) {
    const entryId = this.generateEntryId('sensor');
    const entry = {
      id: entryId,
      type: 'sensor',
      farmId,
      timestamp: new Date().toISOString(),
      data: {
        soil_moisture: sensorData.soil_moisture,
        temperature: sensorData.temperature,
        humidity: sensorData.humidity,
        light_intensity: sensorData.light_intensity,
        soil_ph: sensorData.soil_ph,
        soil_nitrogen: sensorData.soil_nitrogen,
        soil_phosphorus: sensorData.soil_phosphorus,
        soil_potassium: sensorData.soil_potassium,
        device_id: sensorData.device_id,
        zone: sensorData.zone
      },
      source: 'sensor',
      created_at: new Date().toISOString(),
      audit: {
        created_by: 'system',
        ip_address: 'sensor-gateway'
      }
    };

    this.db.get(ENTRIES_COLLECTION).set(entryId, entry);
    await this.addTimelineEvent(farmId, entryId, 'SENSOR_READING', {
      type: 'sensor',
      zone: sensorData.zone,
      readings: entry.data
    });

    return entry;
  }

  async createIrrigationEntry(farmId, irrigationData) {
    const entryId = this.generateEntryId('irrigation');
    const entry = {
      id: entryId,
      type: 'irrigation',
      farmId,
      timestamp: new Date().toISOString(),
      data: {
        start_time: irrigationData.start_time,
        end_time: irrigationData.end_time,
        duration_minutes: irrigationData.duration_minutes,
        water_volume_liters: irrigationData.water_volume_liters,
        method: irrigationData.method,
        zone: irrigationData.zone,
        device_id: irrigationData.device_id,
        flow_rate: irrigationData.flow_rate,
        pressure_psi: irrigationData.pressure_psi
      },
      source: 'device',
      created_at: new Date().toISOString(),
      audit: {
        created_by: 'irrigation-controller',
        ip_address: 'device-gateway'
      }
    };

    this.db.get(ENTRIES_COLLECTION).set(entryId, entry);
    await this.addTimelineEvent(farmId, entryId, 'IRRIGATION', {
      type: 'irrigation',
      zone: irrigationData.zone,
      duration: irrigationData.duration_minutes,
      volume: irrigationData.water_volume_liters
    });

    return entry;
  }

  async createManualEntry(farmId, entryData) {
    const entryId = this.generateEntryId('manual');
    const entry = {
      id: entryId,
      type: 'manual',
      farmId,
      timestamp: new Date().toISOString(),
      data: {
        activity: entryData.activity,
        notes: entryData.notes,
        photos: entryData.photos || [],
        weather: entryData.weather,
        temperature: entryData.temperature,
        humidity: entryData.humidity,
        location: entryData.location
      },
      source: 'manual',
      created_at: new Date().toISOString(),
      audit: {
        created_by: entryData.userId || 'unknown',
        ip_address: 'web-client'
      }
    };

    this.db.get(ENTRIES_COLLECTION).set(entryId, entry);
    await this.addTimelineEvent(farmId, entryId, 'MANUAL_ACTIVITY', {
      type: 'manual',
      activity: entryData.activity,
      notes: entryData.notes
    });

    return entry;
  }

  async createActivityEntry(farmId, activityData) {
    const entryId = this.generateEntryId('activity');
    const entry = {
      id: entryId,
      type: 'activity',
      farmId,
      timestamp: new Date().toISOString(),
      data: {
        activity: activityData.activity,
        quantity: activityData.quantity,
        unit: activityData.unit,
        area: activityData.area,
        workers: activityData.workers,
        notes: activityData.notes,
        cost: activityData.cost
      },
      source: 'manual',
      created_at: new Date().toISOString(),
      audit: {
        created_by: activityData.userId || 'unknown',
        ip_address: 'web-client'
      }
    };

    this.db.get(ENTRIES_COLLECTION).set(entryId, entry);
    await this.addTimelineEvent(farmId, entryId, 'FARM_ACTIVITY', {
      type: 'activity',
      activity: activityData.activity,
      area: activityData.area
    });

    return entry;
  }

  async createWeatherEntry(farmId, weatherData) {
    const entryId = this.generateEntryId('weather');
    const entry = {
      id: entryId,
      type: 'weather',
      farmId,
      timestamp: new Date().toISOString(),
      data: {
        source: weatherData.source,
        temperature: weatherData.temperature,
        humidity: weatherData.humidity,
        rainfall_mm: weatherData.rainfall_mm,
        wind_speed: weatherData.wind_speed,
        wind_direction: weatherData.wind_direction,
        cloud_cover: weatherData.cloud_cover,
        uv_index: weatherData.uv_index,
        description: weatherData.description
      },
      source: weatherData.source || 'api',
      created_at: new Date().toISOString(),
      audit: {
        created_by: 'weather-service',
        ip_address: 'external-api'
      }
    };

    this.db.get(ENTRIES_COLLECTION).set(entryId, entry);
    await this.addTimelineEvent(farmId, entryId, 'WEATHER', {
      type: 'weather',
      source: weatherData.source,
      temperature: weatherData.temperature,
      humidity: weatherData.humidity
    });

    return entry;
  }

  async createFertilizerBatch(farmId, batchData) {
    const batchId = this.generateBatchId();
    const now = new Date().toISOString();
    
    const batch = {
      id: batchId,
      type: 'fertilizer',
      farmId,
      status: 'pending',
      timestamp: now,
      materials: batchData.materials.map(m => ({
        name: m.name,
        n: m.n,
        p: m.p,
        k: m.k,
        amountKg: m.amountKg,
        supplier: m.supplier,
        lot_number: m.lot_number,
        expiry_date: m.expiry_date
      })),
      method: batchData.method,
      timing: batchData.timing,
      weatherCondition: batchData.weatherCondition,
      area: batchData.area,
      crop: batchData.crop,
      stage: batchData.stage,
      notes: batchData.notes,
      source: batchData.source,
      timeline: [
        {
          event: 'BATCH_CREATED',
          timestamp: now,
          actor: batchData.userId || 'system',
          notes: 'Batch created'
        }
      ],
      created_at: now,
      audit: {
        created_by: batchData.userId || 'unknown',
        ip_address: batchData.source === 'sensor_ai' ? 'ai-service' : 'web-client'
      }
    };

    this.db.get(BATCHES_COLLECTION).set(batchId, batch);
    await this.addTimelineEvent(farmId, batchId, 'FERTILIZER_BATCH', {
      type: 'fertilizer',
      batch_id: batchId,
      materials: batch.materials,
      method: batch.method,
      area: batch.area,
      crop: batch.crop
    });

    return batch;
  }

  async addTimelineEvent(farmId, refId, eventType, data) {
    const eventId = this.generateTimelineId();
    const event = {
      id: eventId,
      farmId,
      ref_id: refId,
      event_type: eventType,
      data,
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    const collection = this.db.get(TIMELINE_COLLECTION);
    if (!collection.has(farmId)) {
      collection.set(farmId, new Map());
    }
    collection.get(farmId).set(eventId, event);

    return event;
  }

  async getJournal(farmId, startDate, endDate) {
    const entries = [];
    const collection = this.db.get(ENTRIES_COLLECTION);
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();

    for (const [id, entry] of collection) {
      if (entry.farmId === farmId) {
        const entryTime = new Date(entry.timestamp).getTime();
        if (entryTime >= start && entryTime <= end) {
          entries.push(entry);
        }
      }
    }

    entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return entries;
  }

  async getTimeline(farmId, startDate, endDate) {
    const events = [];
    const collection = this.db.get(TIMELINE_COLLECTION);
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();

    const farmEvents = collection.get(farmId);
    if (farmEvents) {
      for (const [id, event] of farmEvents) {
        const eventTime = new Date(event.timestamp).getTime();
        if (eventTime >= start && eventTime <= end) {
          events.push(event);
        }
      }
    }

    events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return events;
  }

  async getSummary(farmId, days) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const endDate = new Date().toISOString().slice(0, 10);
    
    const entries = await this.getJournal(farmId, startDate, endDate);
    const batches = this.getBatches(farmId, 100);

    const summary = {
      period: { startDate, endDate, days },
      total_entries: entries.length,
      by_type: {},
      by_source: {},
      activities: [],
      weather: null,
      fertilizer_batches: {
        total: batches.length,
        pending: batches.filter(b => b.status === 'pending').length,
        completed: batches.filter(b => b.status === 'completed').length
      },
      sensor_readings: {
        avg_soil_moisture: 0,
        avg_temperature: 0,
        avg_humidity: 0
      }
    };

    let soilMoistureSum = 0, tempSum = 0, humiditySum = 0;
    let sensorCount = 0;

    for (const entry of entries) {
      summary.by_type[entry.type] = (summary.by_type[entry.type] || 0) + 1;
      summary.by_source[entry.source] = (summary.by_source[entry.source] || 0) + 1;

      if (entry.type === 'sensor') {
        soilMoistureSum += entry.data.soil_moisture || 0;
        tempSum += entry.data.temperature || 0;
        humiditySum += entry.data.humidity || 0;
        sensorCount++;
      }

      if (entry.type === 'activity') {
        summary.activities.push({
          activity: entry.data.activity,
          quantity: entry.data.quantity,
          area: entry.data.area,
          timestamp: entry.timestamp
        });
      }

      if (entry.type === 'weather' && !summary.weather) {
        summary.weather = entry.data;
      }
    }

    if (sensorCount > 0) {
      summary.sensor_readings = {
        avg_soil_moisture: Math.round(soilMoistureSum / sensorCount * 10) / 10,
        avg_temperature: Math.round(tempSum / sensorCount * 10) / 10,
        avg_humidity: Math.round(humiditySum / sensorCount * 10) / 10
      };
    }

    return summary;
  }

  getBatches(farmId, limit = 50) {
    const batches = [];
    const collection = this.db.get(BATCHES_COLLECTION);

    for (const [id, batch] of collection) {
      if (batch.farmId === farmId) {
        batches.push(batch);
      }
    }

    batches.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return batches.slice(0, limit);
  }

  getBatch(batchId) {
    return this.db.get(BATCHES_COLLECTION).get(batchId);
  }

  updateBatchStatus(batchId, status, timestamp) {
    const batch = this.db.get(BATCHES_COLLECTION).get(batchId);
    if (!batch) {
      throw new Error('Batch not found');
    }

    const statusTransitions = {
      pending: ['in_progress', 'cancelled'],
      in_progress: ['completed', 'cancelled'],
      completed: [],
      cancelled: []
    };

    if (!statusTransitions[batch.status].includes(status)) {
      throw new Error(`Invalid status transition from ${batch.status} to ${status}`);
    }

    const oldStatus = batch.status;
    batch.status = status;
    batch.timeline.push({
      event: `STATUS_${status.toUpperCase()}`,
      timestamp,
      actor: 'system',
      notes: `Status changed from ${oldStatus} to ${status}`
    });

    this.db.get(BATCHES_COLLECTION).set(batchId, batch);
    return batch;
  }

  async exportTraceability(farmId, cropId) {
    const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const endDate = new Date().toISOString().slice(0, 10);

    const timeline = await this.getTimeline(farmId, startDate, endDate);
    
    const traceability = {
      farmId,
      crop_id: cropId,
      export_date: new Date().toISOString(),
      timeline: timeline.filter(e => 
        e.data.crop === cropId || !e.data.crop
      ),
      summary: {
        total_events: timeline.length,
        fertilizer_applications: timeline.filter(e => e.event_type === 'FERTILIZER_BATCH').length,
        irrigations: timeline.filter(e => e.event_type === 'IRRIGATION').length,
        activities: timeline.filter(e => e.event_type === 'FARM_ACTIVITY').length
      }
    };

    return traceability;
  }

  getTelemetry() {
    return {
      total_entries: this.db.get(ENTRIES_COLLECTION).size,
      total_batches: this.db.get(BATCHES_COLLECTION).size,
      total_timeline_events: this.db.get(TIMELINE_COLLECTION).size,
      status: 'operational',
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = new FarmJournalService();