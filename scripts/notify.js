#!/usr/bin/env node
'use strict';
/* Simple notifier supporting telegram, slack, gas, and email via environment/config */
const https = require('https');
const http = require('http');

function parseArgs() {
  const args = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.substring(2);
      const val = (i + 1 < argv.length && !argv[i + 1].startsWith('--')) ? argv[i + 1] : true;
      args[key] = val;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs();
  const event = (args.event || process.env.NOTIFY_EVENT || 'PR_CREATED').toLowerCase();
  const prUrl = args.pr_url || process.env.PR_URL || '';
  const prNumber = args.pr_number || process.env.PR_NUMBER || '';
  const head = args.head || process.env.PR_HEAD || '';
  const base = args.base || process.env.PR_BASE || '';

  const channel = (process.env.NOTIFY_CHANNEL || 'telegram').toLowerCase();
  if (!['telegram','slack','gas','email','webhook'].includes(channel)) {
    console.log('Notify: channel not configured or unsupported. Skipping.');
    return;
  }

  const payload = {
    event,
    prUrl,
    prNumber,
    head,
    base,
    timestamp: new Date().toISOString()
  };

  if (channel === 'telegram') {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chat = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chat) { console.log('Telegram not configured; skipping telegram notification.'); return; }
    const text = `PR #${prNumber} Created: ${prUrl}\nHead: ${head} Base: ${base}`;
    const url = `/bot${token}/sendMessage?chat_id=${chat}&text=${encodeURIComponent(text)}&parse_mode=Markdown`;
    const req = https.request({ hostname: 'api.telegram.org', path: url, method: 'GET' }, res => res.on('data', () => {}));
    req.on('error', () => {});
    req.end();
    console.log('Telegram notification sent (if configured).');
  } else if (channel === 'slack') {
    const webhook = process.env.SLACK_WEBHOOK_URL;
    if (!webhook) { console.log('Slack webhook URL not configured; skipping Slack notification.'); return; }
    const text = `PR #${prNumber} Created: ${prUrl} (Head:${head} Base:${base})`;
    const postData = JSON.stringify({ text });
    const url = new URL(webhook);
    const req = https.request({ hostname: url.hostname, path: url.pathname, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) } }, res => res.on('data', () => {}));
    req.on('error', () => {});
    req.write(postData);
    req.end();
    console.log('Slack notification sent (if configured).');
  } else if (channel === 'gas') {
    const gasUrl = process.env.GAS_WEBAPP_URL; if (!gasUrl) { console.log('Gas URL not configured; skipping Gas notification.'); return; }
    const data = JSON.stringify(payload);
    const url = new URL(gasUrl);
    const req = https.request({ hostname: url.hostname, port: url.port || 443, path: url.pathname, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': data.length } }, res => res.on('data', () => {}));
    req.on('error', () => {});
    req.write(data); req.end();
    console.log('Gas notification sent (if configured).');
  } else if (channel === 'email') {
    // Simple email notifier using nodemailer (optional dependency)
    // If not available, skip gracefully
    try {
      const nodemailer = require('nodemailer');
      const host = process.env.SMTP_HOST; const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
      const user = process.env.SMTP_USER; const pass = process.env.SMTP_PASS; const to = process.env.EMAIL_TO;
      if (host && port && user && pass && to) {
        const transporter = nodemailer.createTransport({ host, port, auth: { user, pass } });
        const mailOptions = { from: user, to, subject: `PR ${prNumber} Created`, text: `PR ${prNumber} Created: ${prUrl}\nHead: ${head}\nBase: ${base}` };
        transporter.sendMail(mailOptions).catch(() => {});
        console.log('Email notification sent (if configured).');
      } else {
        console.log('Email not configured; skipping email notification.');
      }
    } catch (e) {
      console.log('Email notifier not available; skipping. Install nodemailer to enable this feature.');
    }
  }
}

main().catch(err => {
  console.error('Notify failed:', err);
});
