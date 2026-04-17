---
name: health-check
description: "Check system health and API endpoints for EcoSynTech"
user-invocable: true
agent: explore
---

# Health Check Skill for EcoSynTech-web

Perform system health check for the EcoSynTech IoT backend.

## 1. Server Status
- Check if server is running (ps aux | grep node)
- Check port 3000 binding
- Check process uptime

## 2. API Endpoints Health
Test these endpoints:
- GET /health - Main health check
- GET /metrics - Prometheus metrics
- GET /api/v1/status - API status

## 3. Database Connection
- Check sql.js database file
- Run test queries
- Check data integrity

## 4. MQTT Broker
- Check if mosquitto is running
- Test connection to MQTT broker
- Check for queued messages

## 5. Device Connectivity
- Check registered devices
- Verify ESP32 devices are reporting
- Check last seen timestamps

## 6. Dependencies Status
- Check if required services are running
- Verify disk space
- Check memory usage

Execute checks and provide status report in format:

```
## System Health Report

### Server
- Status: RUNNING/STOPPED
- Uptime: X hours
- Memory: X MB

### API
- /health: OK/FAIL
- /metrics: OK/FAIL  
- /api/v1/status: OK/FAIL

### Database
- Status: CONNECTED/DISCONNECTED
- Records: X

### MQTT
- Status: CONNECTED/DISCONNECTED
- Subscriptions: X

### Devices
- Active: X
- Last 24h: X

### Disk
- Used: X%
```

If any critical service is DOWN, provide recovery instructions.