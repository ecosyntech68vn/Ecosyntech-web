/**
 * Farm Journal API Routes
 * Daily Agricultural Logging with Traceability
 */

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const farmJournalService = require('../services/farmJournalService');

// POST /api/journal/sensor - Create entry from sensor data
router.post('/sensor', auth, async (req, res) => {
  try {
    const { farmId, sensorData } = req.body;
    const entry = await farmJournalService.createSensorEntry(farmId || req.user?.farmId, sensorData);
    res.json({ ok: true, data: entry });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// POST /api/journal/irrigation - Create entry from irrigation device
router.post('/irrigation', auth, async (req, res) => {
  try {
    const { farmId, irrigationData } = req.body;
    const entry = await farmJournalService.createIrrigationEntry(farmId || req.user?.farmId, irrigationData);
    res.json({ ok: true, data: entry });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// POST /api/journal/fertilizer - Create fertilizer batch
router.post('/fertilizer', auth, async (req, res) => {
  try {
    const { farmId, materials, method, area, crop, stage, notes, timing, weatherCondition } = req.body;
    const result = await farmJournalService.createFertilizerBatch(farmId || req.user?.farmId, {
      materials,
      method,
      area,
      crop,
      stage,
      notes,
      timing,
      weatherCondition,
      userId: req.user?.id,
      source: 'manual'
    });
    res.json({ ok: true, data: result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// POST /api/journal/fertilizer/ai - AI auto-create fertilizer batch
router.post('/fertilizer/ai', auth, async (req, res) => {
  try {
    const { farmId, sensorData, crop, stage, area } = req.body;
    
    // AI calculates fertilizer needs based on sensor data
    const materials = [];
    const soilMoisture = sensorData?.soil_moisture || 50;
    const temperature = sensorData?.temperature || 25;
    const humidity = sensorData?.humidity || 70;
    
    // Calculate NPK based on conditions
    if (temperature > 30) {
      materials.push({ name: 'UREA', n: 46, p: 0, k: 0, amountKg: 5 }); // High temp - more N
    }
    if (humidity < 60) {
      materials.push({ name: 'NPK 20-20-15', n: 20, p: 20, k: 15, amountKg: 10 });
    }
    if (soilMoisture < 40) {
      materials.push({ name: 'KCL', n: 0, p: 0, k: 60, amountKg: 3 });
    }
    // Default balanced fertilizer
    if (materials.length === 0) {
      materials.push({ name: 'NPK 16-16-8', n: 16, p: 16, k: 8, amountKg: 8 });
    }

    const result = await farmJournalService.createFertilizerBatch(farmId || req.user?.farmId, {
      materials,
      method: 'drip',
      timing: 'morning',
      weatherCondition: 'optimal',
      area,
      crop,
      stage,
      notes: 'AI recommended based on sensor data',
      userId: req.user?.id,
      source: 'sensor_ai'
    });
    
    res.json({ 
      ok: true, 
      data: result,
      aiRecommendation: {
        reason: 'Calculated based on current sensor readings',
        temperature,
        humidity,
        soilMoisture,
        recommendation: materials.map(m => `${m.name}: ${m.amountKg}kg`)
      }
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// POST /api/journal/manual - Create manual entry
router.post('/manual', auth, async (req, res) => {
  try {
    const { farmId, activity, notes, photos, weather, temperature, humidity } = req.body;
    const entry = await farmJournalService.createManualEntry(farmId || req.user?.farmId, {
      activity,
      notes,
      photos,
      weather,
      temperature,
      humidity
    });
    res.json({ ok: true, data: entry });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// POST /api/journal/activity - Create activity entry
router.post('/activity', auth, async (req, res) => {
  try {
    const { farmId, activity, quantity, area, workers, notes } = req.body;
    const entry = await farmJournalService.createActivityEntry(farmId || req.user?.farmId, {
      activity,
      quantity,
      area,
      workers,
      notes
    });
    res.json({ ok: true, data: entry });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// POST /api/journal/weather - Create weather entry
router.post('/weather', auth, async (req, res) => {
  try {
    const { farmId, source, weatherData } = req.body;
    const entry = await farmJournalService.createWeatherEntry(farmId || req.user?.farmId, {
      source,
      ...weatherData
    });
    res.json({ ok: true, data: entry });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// GET /api/journal - Get journal entries
router.get('/', auth, async (req, res) => {
  try {
    const { farmId, startDate, endDate } = req.query;
    const entries = await farmJournalService.getJournal(
      farmId || req.user?.farmId,
      startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      endDate || new Date().toISOString().slice(0, 10)
    );
    res.json({ ok: true, data: entries, count: entries.length });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// GET /api/journal/timeline - Get timeline for traceability
router.get('/timeline', auth, async (req, res) => {
  try {
    const { farmId, startDate, endDate } = req.query;
    const timeline = await farmJournalService.getTimeline(
      farmId || req.user?.farmId,
      startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      endDate || new Date().toISOString().slice(0, 10)
    );
    res.json({ ok: true, data: timeline });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// GET /api/journal/summary - Get summary
router.get('/summary', auth, async (req, res) => {
  try {
    const { farmId, days } = req.query;
    const summary = await farmJournalService.getSummary(
      farmId || req.user?.farmId,
      parseInt(days) || 7
    );
    res.json({ ok: true, data: summary });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// GET /api/journal/batches - Get fertilizer batches
router.get('/batches', auth, async (req, res) => {
  try {
    const { farmId, limit } = req.query;
    const batches = farmJournalService.getBatches(
      farmId || req.user?.farmId,
      parseInt(limit) || 50
    );
    res.json({ ok: true, data: batches });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// GET /api/journal/batches/:batchId - Get batch details
router.get('/batches/:batchId', auth, async (req, res) => {
  try {
    const { batchId } = req.params;
    const batch = farmJournalService.getBatch(batchId);
    if (!batch) {
      return res.status(404).json({ ok: false, error: 'Batch not found' });
    }
    res.json({ ok: true, data: batch });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// PATCH /api/journal/batches/:batchId/status - Update batch status
router.patch('/batches/:batchId/status', auth, async (req, res) => {
  try {
    const { batchId } = req.params;
    const { status } = req.body;
    const batch = farmJournalService.updateBatchStatus(batchId, status, new Date().toISOString());
    res.json({ ok: true, data: batch });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// GET /api/journal/traceability/:cropId - Export traceability data
router.get('/traceability/:cropId', auth, async (req, res) => {
  try {
    const { cropId } = req.params;
    const { farmId } = req.query;
    const data = await farmJournalService.exportTraceability(farmId || req.user?.farmId, cropId);
    res.json({ ok: true, data });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;