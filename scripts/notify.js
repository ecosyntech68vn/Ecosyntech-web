#!/usr/bin/env node
'use strict';
// Multi-channel notifier: telegram, slack, gas, email
const https = require('https');
const { URL } = require('url');

function toArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  return String(val).split(',').map(v => v.trim()).filter(Boolean);
}

async function main() {
  const channels = toArray(process.env.NOTIFY_CHANNEL || 'telegram');
  const event = (process.env.NOTIFY_EVENT || 'PR_CREATED').toLowerCase();
  const prUrl = process.env.PR_URL || '';
  const prNumber = process.env.PR_NUMBER || '';
  const head = process.env.PR_HEAD || '';
  const base = process.env.PR_BASE || '';
  const payload = { event, prUrl, prNumber, head, base, timestamp: new Date().toISOString() };

  // Telegram channel
  if (channels.includes('telegram')) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chat = process.env.TELEGRAM_CHAT_ID;
    console.log('[TELEGRAM] Token exists:', !!token, 'Chat ID exists:', !!chat);
    if (token && chat) {
      const text = `✅ *PR Created!*%0A%23${prNumber}%0A${prUrl}%0AHead: ${head} → Base: ${base}`;
      const tgPath = `/bot${token}/sendMessage?chat_id=${chat}&text=${text}&parse_mode=Markdown`;
      console.log('[TELEGRAM] Sending to:', `https://api.telegram.org${tgPath.substring(0, 50)}...`);
      const req = https.request({ hostname: 'api.telegram.org', path: tgPath, method: 'GET' }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          console.log('[TELEGRAM] Response status:', res.statusCode, 'Body:', data);
        });
      });
      req.on('error', err => console.error('[TELEGRAM] Error:', err.message));
      req.end();
      console.log('Telegram notification triggered.');
    } else {
      console.log('Telegram not configured. Need TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID env vars.');
    }
  }

  // Optional: test telegram notifier without affecting PR flow
  if (process.env.TELEGRAM_TEST === '1') {
    const t = process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN_OVERRIDE;
    const c = process.env.TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHAT_ID_OVERRIDE;
    if (t && c) {
      const testText = '[TEST] Telegram notifier is wired and can reach chat';
      const testPath = `/bot${t}/sendMessage?chat_id=${c}&text=${encodeURIComponent(testText)}&parse_mode=Markdown`;
      https.request({ hostname: 'api.telegram.org', path: testPath, method: 'GET' }, () => {}).on('error', () => {}).end();
      console.log('Telegram test message sent (override)');
    } else {
      console.log('Telegram test not configured (token/chat_id missing).');
    }
  }

  // Slack channel
  if (channels.includes('slack')) {
    const webhook = process.env.SLACK_WEBHOOK_URL;
    if (webhook) {
      const text = `PR #${prNumber} Created: ${prUrl} (Head:${head} Base:${base})`;
      const postData = JSON.stringify({ text });
      const url = new URL(webhook);
      https.request({ hostname: url.hostname, path: url.pathname, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) } }, res => res.on('data', () => {})).end(postData);
      console.log('Slack notification sent.');
    } else {
      console.log('Slack webhook not configured.');
    }
  }

  // Gas channel
  if (channels.includes('gas')) {
    const gasUrl = process.env.GAS_WEBAPP_URL; if (!gasUrl) { console.log('Gas URL not configured.'); return; }
    const data = JSON.stringify(payload);
    const url = new URL(gasUrl);
    https.request({ hostname: url.hostname, port: url.port || 443, path: url.pathname, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': data.length } }, res => res.on('data', () => {})).end(data);
    console.log('Gas notification sent.');
  }

  // Email channel ( Gmail )
  if (channels.includes('email')) {
    try {
      const nodemailer = require('nodemailer');
      const host = process.env.SMTP_HOST || 'smtp.gmail.com';
      const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
      const user = process.env.SMTP_USER || '';
      const pass = process.env.SMTP_PASS || '';
      const to = process.env.EMAIL_TO || '';
      if (user && pass && to) {
        const secure = port === 465;
        const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
        const mailOptions = { from: user, to, subject: `PR ${prNumber} Created`, text: `PR ${prNumber} Created: ${prUrl}\nHead: ${head}\nBase: ${base}` };
        transporter.sendMail(mailOptions).catch(() => {});
        console.log('Email notification sent (configured Gmail).');
      } else {
        console.log('Email not configured; skipping email notification.');
      }
    } catch (e) {
      console.log('Email notifier not available; install nodemailer to enable this feature.');
    }
  }
}

main().catch(err => {
  console.error('Notify failed:', err);
});
