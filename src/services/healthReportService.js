const axios = require('axios');
const os = require('os');
const si = require('systeminformation');
const path = require('path');
const fs = require('fs');
const logger = require('../config/logger');
// Version reference from package.json for accurate reporting
const pkg = require('../../package.json');

class HealthReportService {
  constructor() {
    // WebLocal (weblocal) endpoints and keys
    this.webLocalUrl = process.env.WEBLOCAL_WEBAPP_URL || process.env.WEBLOCAL_URL || process.env.GAS_WEBAPP_URL || '';
    this.webLocalApiKey = process.env.WEBLOCAL_API_KEY || process.env.WEBLOCAL_APIKEY || process.env.GAS_API_KEY || '';
    // Optional customer id for per-customer provisioning (ESP32 firmware mapping)
    this.customerId = process.env.CUSTOMER_ID || '';
    this.clientId = process.env.CLIENT_ID || 'default_client';
    // Report interval (minutes) with fallback to 30
    const val = parseInt(process.env.HEALTH_REPORT_INTERVAL_MIN || '30', 10);
    this.reportIntervalMs = isNaN(val) ? 30 * 60 * 1000 : val * 60 * 1000;
    this.timer = null;
    // Persistent retry queue for failed reports (on local/offline)
    this.queuePath = path.join(__dirname, '..', 'data', 'health_report_queue.json');
    this.ensureQueueFile();
  }

  start() {
    if (!this.webLocalUrl || !this.webLocalApiKey) {
      logger.warn('[HealthReport] WEBLOCAL_WEBAPP_URL hoặc WEBLOCAL_API_KEY chưa được cấu hình. Dịch vụ bị tắt.');
      return;
    }
    logger.info(`[HealthReport] Khởi động. Báo cáo sẽ gửi mỗi ${this.reportIntervalMs / 60000} phút.`);
    this.report(); // Gửi ngay lần đầu
    this.timer = setInterval(() => this.report(), this.reportIntervalMs);
  }

  async report() {
    try {
      // Retry any queued reports first
      await this.processQueue();
      // Thu thập hệ thống
      const cpu = await si.currentLoad();
      const mem = await si.mem();
      const disks = await si.fsSize();
      const mainDisk = disks.find(d => d.mount === '/' || d.mount === 'C:') || disks[0];

      const payload = {
        action: 'web_health_report',
        client_id: this.clientId,
        customer_id: this.customerId,
        timestamp: new Date().toISOString(),
        system: {
          uptime: os.uptime(),
          cpu_usage: (cpu?.currentLoad ?? 0).toFixed(1),
      mem_usage: (((mem?.used ?? mem?.active ?? 0) / (mem?.total ?? 1)) * 100).toFixed(1),
          disk_usage: mainDisk?.use ?? null,
          docker_ok: await this.checkDocker()
        },
        app: {
          version: pkg.version || '1.0.0',
          active_devices: await this.getActiveDeviceCount(),
          last_error: await this.getLastCriticalError()
        }
      };

      const response = await axios.post(
        `${this.webLocalUrl}?action=web_health_report`,
        payload,
        {
          headers: { 'x-api-key': this.webLocalApiKey },
          timeout: 10000
        }
      );

      if (response.data && response.data.ok) {
        logger.debug('[HealthReport] Health report sent successfully (WEBLOCAL)');
      } else {
        logger.warn('[HealthReport] WEBLOCAL response error:', response.data);
      }
    } catch (error) {
      // On failure, enqueue for retry
      this.enqueueFailedReport(payload, error);
      logger.warn('[HealthReport] Health report failed; added to retry queue. Error:', error?.message);
    }
  }

  // Helpers (có thể chỉnh sau)
  async getActiveDeviceCount() {
    try {
      const { getAll } = require('../config/database');
      // Truy vấn DB để đếm thiết bị online
      const rows = getAll("SELECT COUNT(*) as count FROM devices WHERE status = 'online'");
      return rows?.[0]?.count || 0;
    } catch (e) {
      return 0;
    }
  }

  async getLastCriticalError() {
    try {
      const { getOne } = require('../config/database');
      const row = getOne("SELECT message FROM alerts WHERE severity IN ('danger','critical') ORDER BY timestamp DESC LIMIT 1");
      return row?.message || null;
    } catch (e) {
      return null;
    }
  }

  async checkDocker() {
    try {
      const { execSync } = require('child_process');
      execSync('docker info', { stdio: 'ignore' });
      return true;
    } catch (e) {
      return false;
    }
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
  }

  // --- Queue management for retry ---
  ensureQueueFile() {
    try {
      const dir = path.dirname(this.queuePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      if (!fs.existsSync(this.queuePath)) fs.writeFileSync(this.queuePath, '[]');
    } catch (e) {
      logger.warn('[HealthReport] Failed to initialize retry queue:', e?.message);
    }
  }

  loadQueue() {
    try {
      const content = fs.readFileSync(this.queuePath, 'utf8');
      const data = JSON.parse(content || '[]');
      if (Array.isArray(data)) return data;
      return [];
    } catch (e) {
      return [];
    }
  }

  saveQueue(queue) {
    try {
      fs.writeFileSync(this.queuePath, JSON.stringify(queue, null, 2));
    } catch (e) {
      logger.warn('[HealthReport] Failed to save retry queue:', e?.message);
    }
  }

  enqueueFailedReport(payload, error) {
    const queue = this.loadQueue();
    const item = {
      id: 'HR-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      payload,
      failedAt: new Date().toISOString(),
      error: error?.message
    };
    queue.push(item);
    this.saveQueue(queue);
  }

  async processQueue() {
    const queue = this.loadQueue();
    if (!queue.length) return;
    const remaining = [];
    for (const item of queue) {
      try {
        const res = await axios.post(
          `${this.webLocalUrl}?action=web_health_report`,
          item.payload,
          {
            headers: { 'x-api-key': this.webLocalApiKey },
            timeout: 10000
          }
        );
        if (res.data && res.data.ok) {
          // success -> drop from queue
          continue;
        }
        remaining.push(item);
      } catch (e) {
        remaining.push(item);
      }
    }
    this.saveQueue(remaining);
  }
}

module.exports = new HealthReportService();
