"use strict";

// Lightweight Web Local bridge to report ML health/telemetry to Web Local dashboard
// This module respects a few env vars:
// WEBLOCAL_ENABLED: enable/disable bridge (true/1 enables)
// WEBLOCAL_ENDPOINT: base URL for the Web Local API (e.g. https://weblocal.local/api/report)
// WEBLOCAL_API_KEY: optional API key for authentication

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const DATA_WELOCAL_DIR = path.resolve(process.cwd(), 'data', 'weblocal');
const QUEUE_FILE = path.join(DATA_WELOCAL_DIR, 'queue.json');

function _ensureQueueFile() {
  try {
    if (!fs.existsSync(DATA_WELOCAL_DIR)) {
      fs.mkdirSync(DATA_WELOCAL_DIR, { recursive: true });
    }
    if (!fs.existsSync(QUEUE_FILE)) {
      fs.writeFileSync(QUEUE_FILE, JSON.stringify([]));
    }
  } catch (e) {
    // ignore creation errors; queue will be ephemeral
  }
}

function _loadQueue() {
  try {
    if (!fs.existsSync(QUEUE_FILE)) return [];
    const raw = fs.readFileSync(QUEUE_FILE, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (e) {
    return [];
  }
}

function _saveQueue(queue) {
  try {
    fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2));
  } catch (e) {
    // ignore
  }
}

class WebLocalBridge {
  constructor() {
    this.enabled = process.env.WEBLOCAL_ENABLED === 'true' || process.env.WEBLOCAL_ENABLED === '1';
    this.endpoint = (process.env.WEBLOCAL_ENDPOINT || '').trim();
    this.apiKey = (process.env.WEBLOCAL_API_KEY || '').trim();
    this.maxRetries = 3;
    this.baseDelayMs = 200;
    this._initQueue();
  }

  _initQueue() {
    _ensureQueueFile();
    // Skip timer in test environment
    if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) return;
    // start a lightweight flush loop to retry sending backlog every minute
    if (this._queueInterval) return;
    this._queueInterval = setInterval(() => {
      this.flushQueue().catch(() => {});
    }, 60 * 1000);
  }

  isEnabled() {
    return this.enabled && this.endpoint.length > 0;
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async sendReport(payload) {
    if (!this.isEnabled()) return false;
    const url = this.endpoint.replace(/\/$/, '') + '/telemetry';
    const toSend = Object.assign({}, payload, { timestamp: new Date().toISOString() });
    const headers = {
      'Content-Type': 'application/json'
    };
    if (this.apiKey) headers['Authorization'] = `Bearer ${this.apiKey}`;

    for (let i = 0; i < this.maxRetries; i++) {
      try {
        await axios.post(url, toSend, { headers });
        // on success, try to flush any backlog
        this.flushQueue().catch(() => {});
        return true;
      } catch (err) {
        const delay = this.baseDelayMs * Math.pow(2, i);
        await this._sleep(delay);
      }
    }
    // enqueue for later retry
    this._enqueueQueue(toSend);
    // attempt immediate backlog flush
    this.flushQueue().catch(() => {});
    return false;
  }

  getHealth() {
    return {
      enabled: this.isEnabled(),
      endpoint: this.endpoint
    };
  }

  _enqueueQueue(payload) {
    try {
      const q = _loadQueue();
      q.push(payload);
      _saveQueue(q);
    } catch (e) {
      // ignore
    }
  }

  async flushQueue() {
    if (!this.isEnabled()) return false;
    const queue = _loadQueue();
    if (!queue || queue.length === 0) return true;
    const url = this.endpoint.replace(/\/$/, '') + '/telemetry';
    const headers = {
      'Content-Type': 'application/json'
    };
    if (this.apiKey) headers['Authorization'] = `Bearer ${this.apiKey}`;
    const remaining = [];
    for (const item of queue) {
      try {
        await axios.post(url, Object.assign({}, item, { timestamp: new Date().toISOString() }), { headers });
      } catch (err) {
        remaining.push(item);
      }
    }
    _saveQueue(remaining);
    return remaining.length === 0;
  }
}

module.exports = new WebLocalBridge();
