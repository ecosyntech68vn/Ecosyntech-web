const logger = require('../config/logger');

class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.successThreshold = options.successThreshold || 2;
    this.timeout = options.timeout || 60000;
    this.name = options.name || 'circuit';
    
    this.state = 'CLOSED';
    this.failures = 0;
    this.successes = 0;
    this.nextAttempt = Date.now();
    this.lastFailure = null;
  }

  canAttempt() {
    return Date.now() >= this.nextAttempt;
  }

  async execute(fn) {
    return this.fire(fn);
  }

  async fire(fn) {
    if (!this.canAttempt()) {
      throw new Error(`Circuit ${this.name} is OPEN. Try again later.`);
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  onSuccess() {
    this.failures = 0;
    this.successes++;
    
    if (this.state === 'HALF_OPEN' && this.successes >= this.successThreshold) {
      this.state = 'CLOSED';
      this.successes = 0;
      logger.info(`[CircuitBreaker] ${this.name} CLOSED (recovered)`);
    }
  }

  onFailure(error) {
    this.failures++;
    this.successes = 0;
    this.lastFailure = { message: error.message, time: Date.now() };
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
      logger.error(`[CircuitBreaker] ${this.name} OPENED after ${this.failures} failures`);
    }
  }

  getState() {
    return {
      name: this.name,
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      nextAttempt: this.nextAttempt,
      lastFailure: this.lastFailure
    };
  }

  reset() {
    this.state = 'CLOSED';
    this.failures = 0;
    this.successes = 0;
    this.nextAttempt = Date.now();
  }
}

const circuitBreakers = new Map();

function getBreaker(name, options) {
  if (!circuitBreakers.has(name)) {
    circuitBreakers.set(name, new CircuitBreaker({ name, ...options }));
  }
  return circuitBreakers.get(name);
}

function listBreakers() {
  const breakers = {};
  for (const [name, breaker] of circuitBreakers) {
    breakers[name] = breaker.getState();
  }
  return breakers;
}

function resetBreaker(name) {
  if (circuitBreakers.has(name)) {
    circuitBreakers.get(name).reset();
    return true;
  }
  return false;
}

function resetAllBreakers() {
  for (const breaker of circuitBreakers.values()) {
    breaker.reset();
  }
}

module.exports = {
  CircuitBreaker,
  getBreaker,
  listBreakers,
  resetBreaker,
  resetAllBreakers
};