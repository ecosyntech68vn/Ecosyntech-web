#!/usr/bin/env node
"use strict";
const https = require('https');
const { URL } = require('url');

function main() {
  const prUrl = process.env.PR_URL || '';
  const prNumber = process.env.PR_NUMBER || '';
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!prUrl || !prNumber || !botToken || !chatId) {
    console.log('PR merge notifier not configured properly; skipping Telegram notification.');
    process.exit(0);
  }
  const text = `PR #${prNumber} merged: ${prUrl}`;
  const path = `/bot${botToken}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(text)}&parse_mode=Markdown`;
  const req = https.get({ hostname: 'api.telegram.org', path, agent: false }, (res) => {
    res.on('data', () => {});
  });
  req.on('error', (e) => {
    console.error('Telegram notify error:', e.message);
  });
  req.end();
  console.log('Telegram merge notification sent.');
}

main();
