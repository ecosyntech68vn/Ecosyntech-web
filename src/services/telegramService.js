const axios = require('axios');
const logger = require('../config/logger');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const ALERT_TEMPLATE = {
  critical: '🔴 CRITICAL',
  high: '🟠 HIGH',
  medium: '🟡 MEDIUM',
  low: '🔵 LOW',
  info: 'ℹ️ INFO'
};

async function sendTelegramMessage(message, parseMode = 'Markdown') {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    logger.warn('[Telegram] Bot not configured');
    return { success: false, error: 'Telegram not configured' };
  }

  try {
    const response = await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: parseMode,
        disable_web_page_preview: true
      },
      { timeout: 10000 }
    );

    return { success: true, messageId: response.data.result.message_id };
  } catch (error) {
    logger.error('[Telegram] Send error:', error.message);
    return { success: false, error: error.message };
  }
}

async function sendAlert(type, title, message, details = {}) {
  const emoji = ALERT_TEMPLATE[type] || ALERT_TEMPLATE.info;
  
  const formattedMessage = [
    `${emoji} *EcoSynTech Alert*`,
    '',
    `*${title}*`,
    message,
    ''
  ].join('\n');

  if (Object.keys(details).length > 0) {
    const detailsText = Object.entries(details)
      .map(([k, v]) => `• ${k}: \`${v}\``)
      .join('\n');
    formattedMessage += '\n' + detailsText;
  }

  return sendTelegramMessage(formattedMessage);
}

async function sendDeviceStatus(device) {
  const status = device.status === 'online' ? '🟢 Online' : '🔴 Offline';
  
  return sendTelegramMessage(
    `📡 *Device Status* ${status}`,
    'HTML',
    `<b>${device.name}</b>\n` +
    `ID: ${device.id}\n` +
    `Last seen: ${device.last_seen || 'Unknown'}`
  );
}

async function sendSensorAlert(sensor, value, threshold) {
  return sendAlert(
    'medium',
    'Sensor Alert',
    `*${sensor.type}* exceeded threshold`,
    {
      Device: sensor.device_id,
      Value: `${value}${sensor.unit || ''}`,
      Threshold: threshold,
      Time: new Date().toISOString()
    }
  );
}

async function sendSystemIssue(issue) {
  return sendAlert(
    issue.severity || 'high',
    issue.title,
    issue.description,
    {
      'Farm ID': issue.farmId || 'N/A',
      'Device': issue.deviceId || 'N/A',
      'Time': issue.timestamp || new Date().toISOString()
    }
  );
}

async function sendDailyReport(report) {
  const message = [
    '📊 *EcoSynTech Daily Report*',
    '',
    `*Devices:* ${report.devices?.total || 0} online / ${report.devices?.total || 0} total`,
    `*Sensors:* ${report.sensors?.active || 0} active`,
    `*Alerts:* ${report.alerts?.pending || 0} pending`,
    `*Status:* ${report.status || 'OK'}`,
    ''
  ].join('\n');

  return sendTelegramMessage(message);
}

async function sendBackupStatus(success, details) {
  const emoji = success ? '✅' : '❌';
  
  return sendTelegramMessage(
    `${emoji} *Backup ${success ? 'Completed' : 'Failed'}*`,
    'Markdown',
    success ? `Backup completed successfully` : `Backup failed: ${details.error}`
  );
}

async function sendIncidentCreated(incident) {
  return sendAlert(
    incident.severity,
    'New Incident Created',
    incident.description,
    {
      ID: incident.id,
      'Reported by': incident.reportedBy,
      Time: incident.createdAt
    }
  );
}

async function sendCommandReply(commandId, response) {
  return sendTelegramMessage(
    `⚡ *Command Response*\n\`${commandId}\`\n\n${response}`,
    'Markdown'
  );
}

function formatKeyboard(buttons, cols = 2) {
  return buttons.map((btn, i) => ({
    text: btn.text,
    callback_data: btn.data
  }));
}

async function sendKeyboard(mainButtons, extraButtons = []) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return { success: false, error: 'Not configured' };
  }

  const allButtons = [...mainButtons, ...extraButtons];
  const keyboard = {
    inline_keyboard: allButtons.map(btn => [{ text: btn.text, callback_data: btn.data }])
  };

  try {
    const response = await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        chat_id: TELEGRAM_CHAT_ID,
        text: 'Select option:',
        reply_markup: JSON.stringify(keyboard)
      },
      { timeout: 10000 }
    );

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendTelegramMessage,
  sendAlert,
  sendDeviceStatus,
  sendSensorAlert,
  sendSystemIssue,
  sendDailyReport,
  sendBackupStatus,
  sendIncidentCreated,
  sendCommandReply,
  sendKeyboard
};