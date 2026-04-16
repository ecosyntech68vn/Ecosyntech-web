#!/usr/bin/env node
"use strict";

/*
  Grafana dashboard import helper.
  Reads dashboards/prometheus_dashboard.json and posts to Grafana API to import the dashboard.
  Requires environment variables:
    GF_API_URL  - Grafana base URL (e.g., https://grafana.example.com)
    GF_API_TOKEN - Grafana API token with dashboards:import permission
*/

const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const grafanaUrl = process.env.GF_API_URL || '';
const grafanaToken = process.env.GF_API_TOKEN || '';

if (!grafanaUrl || !grafanaToken) {
  console.log('Grafana URL/token not set. Skipping dashboard import.');
  process.exit(0);
}

const dashboardJson = require('../dashboards/prometheus_dashboard.json');
const data = JSON.stringify(dashboardJson);

try {
  const urlObj = new URL(grafanaUrl);
  const isHttps = urlObj.protocol === 'https:';
  const transport = isHttps ? require('https') : require('http');
  const options = {
    hostname: urlObj.hostname,
    port: urlObj.port || (isHttps ? 443 : 80),
    path: '/api/dashboards/import?overwrite=true',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
      'Authorization': `Bearer ${grafanaToken}`
    }
  };

  const req = transport.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => (body += chunk));
    res.on('end', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log('Grafana dashboard imported successfully.');
      } else {
        console.error(`Grafana import failed: ${res.statusCode} ${body}`);
      }
    });
  });

  req.on('error', (e) => {
    console.error('Grafana import request error:', e.message);
  });

  req.write(data);
  req.end();
} catch (err) {
  console.error('Grafana import failed:', err?.message);
  process.exit(1);
}
