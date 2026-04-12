#!/usr/bin/env node
'use strict';

const https = require('https');
const http = require('http');

const TELEGRAM_API = 'api.telegram.org';
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const ALLOWED_CHAT_IDS = (process.env.TELEGRAM_ALLOWED_CHAT_IDS || '').split(',').filter(Boolean);
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';

let offset = 0;
let lastUpdateTime = 0;

const COMMANDS = {
  '/start': 'Xem hướng dẫn sử dụng',
  '/help': 'Xem hướng dẫn sử dụng',
  '/status': 'Xem trạng thái hệ thống',
  '/sensors': 'Xem dữ liệu cảm biến',
  '/devices': 'Xem danh sách thiết bị',
  '/rules': 'Xem danh sách rules',
  '/alerts': 'Xem cảnh báo',
  '/pump_on': 'Bật máy bơm',
  '/pump_off': 'Tắt máy bơm',
  '/valve1_on': 'Mở van 1',
  '/valve1_off': 'Đóng van 1',
  '/valve2_on': 'Mở van 2',
  '/valve2_off': 'Đóng van 2',
  '/fan_on': 'Bật quạt',
  '/fan_off': 'Tắt quạt',
  '/light_on': 'Bật đèn',
  '/light_off': 'Tắt đèn',
  '/restart': 'Khởi động lại ESP32',
  '/config': 'Xem cấu hình hiện tại'
};

function sendMessage(chatId, text, parseMode = 'Markdown') {
  return new Promise((resolve, reject) => {
    if (!BOT_TOKEN || !chatId) {
      console.log('[TELEGRAM] Missing token or chatId');
      resolve(null);
      return;
    }

    const path = `/bot${BOT_TOKEN}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(text)}&parse_mode=${parseMode}`;
    
    const req = https.request({ hostname: TELEGRAM_API, path, method: 'GET' }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.ok) {
            console.log(`[TELEGRAM] Message sent to ${chatId}`);
            resolve(result.result);
          } else {
            console.error('[TELEGRAM] Send failed:', result.description);
            reject(new Error(result.description));
          }
        } catch (e) {
          reject(e);
        }
      });
    });
    
    req.on('error', err => {
      console.error('[TELEGRAM] Request error:', err.message);
      reject(err);
    });
    
    req.end();
  });
}

function sendPhoto(chatId, photoUrl, caption = '') {
  return new Promise((resolve, reject) => {
    if (!BOT_TOKEN || !chatId || !photoUrl) {
      resolve(null);
      return;
    }

    const postData = JSON.stringify({
      chat_id: chatId,
      photo: photoUrl,
      caption: caption
    });

    const path = `/bot${BOT_TOKEN}/sendPhoto`;
    
    const req = https.request({
      hostname: TELEGRAM_API,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.ok) resolve(result.result);
          else reject(new Error(result.description));
        } catch (e) { reject(e); }
      });
    });
    
    req.on('error', err => reject(err));
    req.end(postData);
  });
}

async function apiRequest(endpoint, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, API_BASE_URL);
    
    const req = http.request({
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      method,
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });
    
    req.on('error', err => {
      console.error('[API] Request error:', err.message);
      reject(err);
    });
    
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function getSensorData() {
  try {
    const data = await apiRequest('/api/sensors');
    if (Array.isArray(data)) {
      return data;
    } else if (data.sensors) {
      return data.sensors;
    }
    return [];
  } catch (e) {
    console.error('[API] Get sensors error:', e.message);
    return [];
  }
}

async function getDevices() {
  try {
    const data = await apiRequest('/api/devices');
    if (data.devices) return data.devices;
    if (Array.isArray(data)) return data;
    return [];
  } catch (e) {
    console.error('[API] Get devices error:', e.message);
    return [];
  }
}

async function getAlerts() {
  try {
    const data = await apiRequest('/api/alerts');
    if (Array.isArray(data)) return data.slice(0, 5);
    if (data.alerts) return data.alerts.slice(0, 5);
    return [];
  } catch (e) {
    console.error('[API] Get alerts error:', e.message);
    return [];
  }
}

async function getRules() {
  try {
    const data = await apiRequest('/api/rules');
    if (data.rules) return data.rules;
    if (Array.isArray(data)) return data;
    return [];
  } catch (e) {
    console.error('[API] Get rules error:', e.message);
    return [];
  }
}

async function sendDeviceCommand(deviceId, command) {
  try {
    const data = await apiRequest(`/api/devices/${deviceId}/command`, 'POST', {
      command,
      params: {}
    });
    return data;
  } catch (e) {
    console.error('[API] Send command error:', e.message);
    return { error: e.message };
  }
}

function formatSensorData(sensors) {
  if (!sensors || sensors.length === 0) {
    return 'Không có dữ liệu cảm biến';
  }

  const icons = {
    temperature: '🌡️',
    humidity: '💧',
    soil: '🌱',
    light: '☀️',
    water: '🌊',
    co2: '💨',
    ec: '⚡',
    ph: '🧪'
  };

  const lines = ['📊 *Dữ Liệu Cảm Biến*\n'];
  
  sensors.forEach(s => {
    const icon = icons[s.type] || '📈';
    const value = s.value !== undefined ? s.value.toFixed(1) : 'N/A';
    const unit = s.unit || '';
    const status = getSensorStatus(s);
    lines.push(`${icon} ${capitalize(s.type)}: *${value}${unit}* ${status}`);
  });

  lines.push(`\n🕐 Cập nhật: ${new Date().toLocaleTimeString('vi-VN')}`);
  
  return lines.join('\n');
}

function getSensorStatus(sensor) {
  if (sensor.min_value !== undefined && sensor.max_value !== undefined) {
    if (sensor.value < sensor.min_value) return '⚠️ Thấp';
    if (sensor.value > sensor.max_value) return '⚠️ Cao';
  }
  return '✅ Bình thường';
}

function capitalize(str) {
  if (!str) return '';
  const translations = {
    temperature: 'Nhiệt độ',
    humidity: 'Độ ẩm KK',
    soil: 'Độ ẩm đất',
    light: 'Ánh sáng',
    water: 'Mực nước',
    co2: 'CO₂',
    ec: 'EC',
    ph: 'pH'
  };
  return translations[str] || str.charAt(0).toUpperCase() + str.slice(1);
}

function formatDeviceStatus(devices) {
  if (!devices || devices.length === 0) {
    return 'Không có thiết bị';
  }

  const lines = ['🖥️ *Trạng Thái Thiết Bị*\n'];
  
  devices.slice(0, 10).forEach(d => {
    const statusIcon = d.status === 'online' ? '🟢' : d.status === 'running' ? '🔵' : '⚪';
    lines.push(`${statusIcon} ${d.name || d.id}: ${d.status || 'unknown'}`);
  });

  lines.push(`\nTổng: ${devices.length} thiết bị`);
  
  return lines.join('\n');
}

function formatRulesList(rules) {
  if (!rules || rules.length === 0) {
    return 'Không có rules';
  }

  const lines = ['⚙️ *Automation Rules*\n'];
  
  rules.slice(0, 10).forEach(r => {
    const statusIcon = r.enabled ? '✅' : '❌';
    lines.push(`${statusIcon} ${r.name}`);
  });

  lines.push(`\nTổng: ${rules.length} rules`);
  
  return lines.join('\n');
}

function formatAlerts(alerts) {
  if (!alerts || alerts.length === 0) {
    return '✅ Không có cảnh báo';
  }

  const lines = ['🚨 *Cảnh Báo*\n'];
  
  alerts.forEach(a => {
    const severityIcon = a.severity === 'danger' ? '🔴' : a.severity === 'warning' ? '🟡' : '🔵';
    lines.push(`${severityIcon} ${a.message || a.sensor || 'Alert'}: ${a.value || ''}`);
  });
  
  return lines.join('\n');
}

function getHelpText() {
  return `🌾 *EcoSynTech IoT Controller*

Xin chào! Tôi là bot điều khiển hệ thống IoT của bạn.

*📋 Lệnh cơ bản:*
/start - Xem hướng dẫn
/help - Xem hướng dẫn
/status - Trạng thái hệ thống
/sensors - Dữ liệu cảm biến
/devices - Danh sách thiết bị
/rules - Automation rules
/alerts - Cảnh báo

*🔌 Điều khiển thiết bị:*
/pump_on - Bật máy bơm
/pump_off - Tắt máy bơm
/valve1_on - Mở van 1
/valve1_off - Đóng van 1
/valve2_on - Mở van 2
/valve2_off - Đóng van 2
/fan_on - Bật quạt
/fan_off - Tắt quạt
/light_on - Bật đèn
/light_off - Tắt đèn
/restart - Khởi động lại ESP32

*⚙️ Cấu hình:*
/config - Xem cấu hình hiện tại

_Gửi lệnh bất kỳ để bắt đầu!_`;
}

async function getSystemStatus() {
  const [sensors, devices, alerts] = await Promise.all([
    getSensorData(),
    getDevices(),
    getAlerts()
  ]);

  const onlineDevices = devices.filter(d => d.status === 'online' || d.status === 'running').length;
  const activeRules = (await getRules()).filter(r => r.enabled).length;

  return `🏠 *Trạng Thái Hệ Thống*

📊 Cảm biến: ${sensors.length} 
🟢 Thiết bị online: ${onlineDevices}/${devices.length}
⚙️ Rules active: ${activeRules}
🚨 Cảnh báo: ${alerts.length}
⏱️ Server: ${process.uptime ? (process.uptime()/3600).toFixed(1) + 'h' : 'N/A'}

🌐 API: ${API_BASE_URL}
🕐 Cập nhật: ${new Date().toLocaleTimeString('vi-VN')}`;
}

async function handleCommand(chatId, command, username) {
  console.log(`[TELEGRAM] Command from ${username}: ${command}`);
  
  switch (command) {
    case '/start':
    case '/help':
      await sendMessage(chatId, getHelpText());
      break;

    case '/status':
      const status = await getSystemStatus();
      await sendMessage(chatId, status);
      break;

    case '/sensors':
      const sensors = await getSensorData();
      await sendMessage(chatId, formatSensorData(sensors));
      break;

    case '/devices':
      const devices = await getDevices();
      await sendMessage(chatId, formatDeviceStatus(devices));
      break;

    case '/rules':
      const rules = await getRules();
      await sendMessage(chatId, formatRulesList(rules));
      break;

    case '/alerts':
      const alerts = await getAlerts();
      await sendMessage(chatId, formatAlerts(alerts));
      break;

    case '/pump_on':
      await sendDeviceCommand('pump', 'relay1_on');
      await sendMessage(chatId, '🔵 *Máy bơm đã bật!*');
      break;

    case '/pump_off':
      await sendDeviceCommand('pump', 'relay1_off');
      await sendMessage(chatId, '⚪ *Máy bơm đã tắt!*');
      break;

    case '/valve1_on':
      await sendDeviceCommand('valve1', 'relay2_on');
      await sendMessage(chatId, '🔵 *Van 1 đã mở!*');
      break;

    case '/valve1_off':
      await sendDeviceCommand('valve1', 'relay2_off');
      await sendMessage(chatId, '⚪ *Van 1 đã đóng!*');
      break;

    case '/valve2_on':
      await sendDeviceCommand('valve2', 'relay3_on');
      await sendMessage(chatId, '🔵 *Van 2 đã mở!*');
      break;

    case '/valve2_off':
      await sendDeviceCommand('valve2', 'relay3_off');
      await sendMessage(chatId, '⚪ *Van 2 đã đóng!*');
      break;

    case '/fan_on':
      await sendDeviceCommand('fan', 'relay4_on');
      await sendMessage(chatId, '🔵 *Quạt đã bật!*');
      break;

    case '/fan_off':
      await sendDeviceCommand('fan', 'relay4_off');
      await sendMessage(chatId, '⚪ *Quạt đã tắt!*');
      break;

    case '/light_on':
      await sendDeviceCommand('light', 'relay5_on');
      await sendMessage(chatId, '🔵 *Đèn đã bật!*');
      break;

    case '/light_off':
      await sendDeviceCommand('light', 'relay5_off');
      await sendMessage(chatId, '⚪ *Đèn đã tắt!*');
      break;

    case '/restart':
      await sendDeviceCommand('esp32', 'restart');
      await sendMessage(chatId, '🔄 *ESP32 đang khởi động lại...*');
      break;

    case '/config':
      await sendMessage(chatId, `⚙️ *Cấu hình Bot*

📡 API: ${API_BASE_URL}
🌐 MQTT: ${MQTT_BROKER_URL}
👥 Allowed Chat IDs: ${ALLOWED_CHAT_IDS.length > 0 ? ALLOWED_CHAT_IDS.join(', ') : 'All (configurable)'}`);
      break;

    default:
      await sendMessage(chatId, `❓ Lệnh không recognized: ${command}\n\nGõ /help để xem danh sách lệnh.`);
  }
}

async function getUpdates() {
  if (!BOT_TOKEN) {
    console.log('[TELEGRAM] Bot token not configured');
    return;
  }

  const path = `/bot${BOT_TOKEN}/getUpdates?offset=${offset}&timeout=10`;
  
  try {
    const data = await new Promise((resolve, reject) => {
      const req = https.request({ hostname: TELEGRAM_API, path }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      });
      req.on('error', reject);
      req.end();
    });

    if (data.ok && data.result && data.result.length > 0) {
      for (const update of data.result) {
        await processUpdate(update);
        offset = update.update_id + 1;
      }
    }
  } catch (e) {
    console.error('[TELEGRAM] Get updates error:', e.message);
  }
}

async function processUpdate(update) {
  const message = update.message || update.edited_message;
  if (!message) return;

  const chatId = message.chat.id.toString();
  const username = message.from.username || message.from.first_name || 'Unknown';
  const text = message.text || '';

  // Check if chat is allowed (if configured)
  if (ALLOWED_CHAT_IDS.length > 0 && !ALLOWED_CHAT_IDS.includes(chatId)) {
    console.log(`[TELEGRAM] Chat ${chatId} not allowed`);
    await sendMessage(chatId, '⛔ Bạn không có quyền sử dụng bot này.');
    return;
  }

  // Handle commands
  if (text.startsWith('/')) {
    await handleCommand(chatId, text.split(' ')[0], username);
  } else {
    // Handle free text commands
    const lowerText = text.toLowerCase().trim();
    await handleFreeTextCommand(chatId, lowerText, username);
  }
}

async function handleFreeTextCommand(chatId, text, username) {
  const commands = {
    'bật bơm': () => handleCommand(chatId, '/pump_on', username),
    'tắt bơm': () => handleCommand(chatId, '/pump_off', username),
    'bật máy bơm': () => handleCommand(chatId, '/pump_on', username),
    'tắt máy bơm': () => handleCommand(chatId, '/pump_off', username),
    'mở van': () => handleCommand(chatId, '/valve1_on', username),
    'đóng van': () => handleCommand(chatId, '/valve1_off', username),
    'bật quạt': () => handleCommand(chatId, '/fan_on', username),
    'tắt quạt': () => handleCommand(chatId, '/fan_off', username),
    'bật đèn': () => handleCommand(chatId, '/light_on', username),
    'tắt đèn': () => handleCommand(chatId, '/light_off', username),
    'trạng thái': () => handleCommand(chatId, '/status', username),
    'cảm biến': () => handleCommand(chatId, '/sensors', username),
    'thiết bị': () => handleCommand(chatId, '/devices', username),
    'cảnh báo': () => handleCommand(chatId, '/alerts', username),
    'help': () => handleCommand(chatId, '/help', username)
  };

  if (commands[text]) {
    await commands[text]();
  } else if (text.length > 0) {
    await sendMessage(chatId, `Tôi hiểu "${text}" nhưng không có lệnh nào phù hợp.\n\nGõ /help để xem danh sách lệnh.`);
  }
}

async function sendAlertToAll(alert) {
  if (!BOT_TOKEN || ALLOWED_CHAT_IDS.length === 0) {
    console.log('[TELEGRAM] Cannot send alert - no recipients configured');
    return;
  }

  const severityEmoji = alert.severity === 'danger' ? '🔴' : alert.severity === 'warning' ? '🟡' : '🔵';
  const message = `${severityEmoji} *CẢNH BÁO*\n\n${alert.message || alert.sensor || 'Alert'}: ${alert.value || ''}\n⏰ ${new Date().toLocaleString('vi-VN')}`;

  for (const chatId of ALLOWED_CHAT_IDS) {
    try {
      await sendMessage(chatId, message);
    } catch (e) {
      console.error(`[TELEGRAM] Failed to send alert to ${chatId}:`, e.message);
    }
  }
}

async function setWebhook() {
  if (!BOT_TOKEN) return;
  
  const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;
  if (!webhookUrl) {
    console.log('[TELEGRAM] Webhook URL not configured, using polling mode');
    return;
  }

  const path = `/bot${BOT_TOKEN}/setWebhook?url=${encodeURIComponent(webhookUrl)}`;
  
  try {
    await new Promise((resolve, reject) => {
      const req = https.request({ hostname: TELEGRAM_API, path }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const result = JSON.parse(data);
          if (result.ok) {
            console.log('[TELEGRAM] Webhook set successfully');
          } else {
            console.error('[TELEGRAM] Webhook set failed:', result.description);
          }
          resolve();
        });
      });
      req.on('error', reject);
      req.end();
    });
  } catch (e) {
    console.error('[TELEGRAM] Set webhook error:', e.message);
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('   EcoSynTech IoT Telegram Controller');
  console.log('═══════════════════════════════════════════════');
  console.log('Bot Token:', BOT_TOKEN ? '✓ Configured' : '✗ Not set');
  console.log('Allowed Chats:', ALLOWED_CHAT_IDS.length > 0 ? ALLOWED_CHAT_IDS.join(', ') : 'All (configure in .env)');
  console.log('API Base URL:', API_BASE_URL);
  console.log('MQTT Broker:', MQTT_BROKER_URL);
  console.log('═══════════════════════════════════════════════');

  if (!BOT_TOKEN) {
    console.log('\n⚠️  WARNING: TELEGRAM_BOT_TOKEN not set!');
    console.log('   Set TELEGRAM_BOT_TOKEN in .env to enable Telegram bot.');
    console.log('   Use polling mode without webhook.\n');
  }

  await setWebhook();

  // Main polling loop
  console.log('\n🚀 Telegram bot started!');
  console.log('   Polling for updates...\n');

  while (true) {
    try {
      await getUpdates();
    } catch (e) {
      console.error('[TELEGRAM] Polling error:', e.message);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[TELEGRAM] Shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[TELEGRAM] Shutting down...');
  process.exit(0);
});

// Export for use as module
module.exports = {
  sendMessage,
  sendAlertToAll,
  handleCommand,
  getSystemStatus,
  getSensorData,
  getDevices
};

// Start if run directly
if (require.main === module) {
  main().catch(err => {
    console.error('[TELEGRAM] Fatal error:', err);
    process.exit(1);
  });
}
