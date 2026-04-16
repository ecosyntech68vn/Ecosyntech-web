const Joi = require('joi');

const schemas = {
  deviceId: Joi.object({
    id: Joi.string().required()
  }),

  deviceConfig: Joi.object({
    name: Joi.string().min(1).max(100),
    type: Joi.string().valid('sensor', 'valve', 'pump', 'fan', 'light', 'gateway'),
    zone: Joi.string().valid('zone1', 'zone2', 'zone3', 'zone4', 'zone5', 'all'),
    config: Joi.object(),
    enabled: Joi.boolean(),
    thresholdLow: Joi.number(),
    thresholdCritical: Joi.number(),
    reportInterval: Joi.number().min(30).max(3600)
  }),

  command: Joi.object({
    command: Joi.string().required().valid('start', 'stop', 'configure', 'restart', 'calibrate', 'refresh'),
    params: Joi.object()
  }),

  rule: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    description: Joi.string().max(500),
    enabled: Joi.boolean().default(true),
    condition: Joi.object({
      sensor: Joi.string().valid('soil', 'temperature', 'humidity', 'light', 'ph', 'water', 'co2', 'ec', 'time').required(),
      operator: Joi.string().valid('<', '>', '<=', '>=', '==').required(),
      value: Joi.alternatives().try(Joi.number(), Joi.string()).required()
    }).required(),
    action: Joi.object({
      type: Joi.string().valid('valve_open', 'valve_close', 'pump_start', 'pump_stop', 'fan_on', 'fan_off', 'light_on', 'light_off', 'alert').required(),
      target: Joi.string().required(),
      delayMinutes: Joi.number().min(0).max(60).default(0)
    }).required(),
    cooldownMinutes: Joi.number().min(1).max(1440).default(30)
  }),

  schedule: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    time: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    duration: Joi.number().min(5).max(240).default(60),
    zones: Joi.array().items(Joi.string().valid('zone1', 'zone2', 'zone3', 'zone4', 'zone5', 'all')).min(1).default(['all']),
    enabled: Joi.boolean().default(true),
    days: Joi.array().items(Joi.string().valid('Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun')).min(1).default(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
  }),

  webhook: Joi.object({
    sensor: Joi.string(),
    value: Joi.number(),
    severity: Joi.string().valid('info', 'warning', 'danger'),
    deviceId: Joi.string(),
    status: Joi.string().valid('online', 'offline')
  }),

  sensorUpdate: Joi.object({
    type: Joi.string().valid('soil', 'temperature', 'humidity', 'light', 'ph', 'water', 'co2', 'ec').required(),
    value: Joi.number().required()
  }),

  envelope: Joi.object({
    payload: Joi.object({
      _did: Joi.string().required(),
      _ts: Joi.number().required(),
      _nonce: Joi.string().required(),
      device_id: Joi.string(),
      fw_version: Joi.string(),
      readings: Joi.array().items(
        Joi.object({
          sensor_type: Joi.string(),
          sensor: Joi.string(),
          type: Joi.string(),
          value: Joi.number().required(),
          unit: Joi.string().allow('')
        })
      ).optional(),
      get_commands: Joi.boolean().optional(),
      get_config: Joi.boolean().optional(),
      get_batch: Joi.boolean().optional(),
      command_id: Joi.string().optional(),
      status: Joi.string().optional(),
      note: Joi.string().allow('').optional()
    }).required(),
    signature: Joi.string().required()
  }),

  deviceCommand: Joi.object({
    device_id: Joi.string().required(),
    command: Joi.string().required(),
    params: Joi.object().optional(),
    command_id: Joi.string().optional()
  }),

  auth: {
    login: Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().min(6).required()
    }),
    register: Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().min(6).required(),
      name: Joi.string().min(1).max(100).required()
    })
  }
};

// Helper to support dotted schema paths like 'auth.login' or 'auth.register'
function getSchemaFromPath(pathName) {
  const parts = pathName.split('.');
  let current = schemas;
  for (const p of parts) {
    if (current && typeof current === 'object' && Object.prototype.hasOwnProperty.call(current, p)) {
      current = current[p];
    } else {
      return null;
    }
  }
  return current;
}

function validate(schema, data) {
  const { error, value } = schema.validate(data, { abortEarly: false });
  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));
    return { valid: false, errors };
  }
  return { valid: true, value };
}

function validateMiddleware(schemaName) {
  return (req, res, next) => {
    const schema = getSchemaFromPath(schemaName);
    if (!schema) {
      return res.status(500).json({ error: 'Invalid validation schema' });
    }

    const result = validate(schema, req.method === 'GET' ? req.query : req.body);
    if (!result.valid) {
      return res.status(400).json({ error: 'Validation failed', details: result.errors });
    }

    if (req.method === 'GET') {
      req.validatedQuery = result.value;
    } else {
      req.validatedBody = result.value;
    }
    next();
  };
}

module.exports = {
  schemas,
  validate,
  validateMiddleware
};
