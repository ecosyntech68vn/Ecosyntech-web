# EcoSynTech Skill Scheduler

Automation orchestration for IoT backend - schedules skill execution via API.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     EcoSynTech Backend                       │
│                      (Express.js)                           │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              /api/v1/skills/scheduler               │    │
│  │                   (CRUD API)                        │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┴────────────────────┐
         ▼                                     ▼
┌─────────────────┐                    ┌─────────────────┐
│  Scheduler UI   │                    │ Scheduler Runner │
│   (Web App)    │                    │  (Background)    │
│                │                    │                  │
│ - View         │                    │ - Executes       │
│ - Create       │                    │   skills on      │
│ - Edit         │                    │   schedule       │
│ - Toggle       │                    │                  │
│ - Delete       │                    │ - Tracks runs    │
│ - Export       │                    │ - Auto-reload   │
└─────────────────┘                    └─────────────────┘
```

## Quick Start

### 1. Set Environment Variable

```bash
# Generate a secure API key
openssl rand -hex 32

# Add to .env
SCHEDULER_API_KEY=your-generated-key
SCHEDULER_ENABLED=true
```

### 2. Start the Scheduler Runner

```bash
# Development
SCHEDULER_API_KEY=your-key node Skill-Management-for-EcoSynTech/scheduler/scheduler-runner.js

# Production (systemd)
sudo cp systemd/ecosyntech-scheduler.service /etc/systemd/system/
sudo systemctl enable ecosyntech-scheduler
sudo systemctl start ecosyntech-scheduler
```

### 3. Access Scheduler UI

Open browser to: `http://localhost:3000/Skill-Management-for-EcoSynTech/scheduler/ui/`

Enter your `SCHEDULER_API_KEY` to authenticate.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/skills/scheduler` | List all schedules |
| POST | `/api/v1/skills/scheduler` | Create new schedule |
| PUT | `/api/v1/skills/scheduler/:id` | Update schedule |
| DELETE | `/api/v1/skills/scheduler/:id` | Delete schedule |
| POST | `/api/v1/skills/scheduler/:id/toggle` | Toggle enabled/disabled |
| POST | `/api/v1/skills/scheduler/execute` | Execute single skill |
| GET | `/api/v1/skills/scheduler/export` | Export config |
| POST | `/api/v1/skills/scheduler/import` | Import config |

### Authentication

All API requests require `X-Scheduler-API-Key` header:

```bash
curl -X GET http://localhost:3000/api/v1/skills/scheduler \
  -H "X-Scheduler-API-Key: your-key"
```

## Schedule Configuration

Edit `config/scheduler.json`:

```json
{
  "version": "1.0",
  "metadata": {
    "version": "1.0",
    "lastModified": "2026-04-17T00:00:00.000Z"
  },
  "schedules": [
    {
      "id": "sched-critical-001",
      "name": "Critical Monitoring",
      "description": "Real-time health checks",
      "interval": "5m",
      "skills": ["health-check", "monitor"],
      "enabled": true,
      "createdAt": "2026-04-17T00:00:00.000Z",
      "lastRun": null,
      "runCount": 0
    }
  ]
}
```

### Interval Formats

| Format | Description |
|--------|-------------|
| `5m` | 5 minutes |
| `15m` | 15 minutes |
| `30m` | 30 minutes |
| `1h` | 1 hour |
| `2h` | 2 hours |
| `1d` | 1 day |

## Available Skills (26 Total)

| Category | Skills |
|----------|--------|
| Security | security-audit, firewall-setup, ssl-manager |
| Operations | health-check, monitor, alerting, system-report, config-manager, api-gateway, user-manager |
| Debug | log-analyzer, iot-debug, fix-common |
| DevOps | deployment, test-runner, device-provision, firmware-update |
| Maintenance | backup, update, database-migrate, db-cleanup, cache-manager, auto-scale |
| Monitoring | metrics-export |
| Quality | load-test |
| Automation | scheduler |

## Systemd Service

```ini
[Unit]
Description=EcoSynTech Skill Scheduler
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/ecosyntech-web
Environment=SCHEDULER_API_KEY=your-key
Environment=PORT=3000
ExecStart=/usr/bin/node Skill-Management-for-EcoSynTech/scheduler/scheduler-runner.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

## Monitoring

### Check Status

```bash
# View scheduler logs
sudo journalctl -u ecosyntech-scheduler -f

# Check if running
ps aux | grep scheduler-runner
```

### Metrics

The scheduler tracks:
- `runCount`: Total executions
- `lastRun`: Last execution timestamp
- `enabled`: Active status

## Troubleshooting

### Scheduler not starting

1. Check SCHEDULER_API_KEY is set
2. Verify config/scheduler.json exists
3. Check port 3000 is available

### API returns 401/403

- Verify API key matches SCHEDULER_API_KEY
- Check for typos in header name: `X-Scheduler-API-Key`

### Skills not executing

1. Verify schedules are enabled
2. Check interval format is correct
3. View logs: `sudo journalctl -u ecosyntech-scheduler`
