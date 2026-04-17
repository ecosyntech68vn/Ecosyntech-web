# EcoSynTech Skills

Custom skills for managing EcoSynTech IoT backend - Complete automation suite (26 skills).

## Available Skills (26 Total)

| # | Skill | Description | Category |
|---|-------|-------------|----------|
| 1 | `/scheduler` | Orchestrate other skills | Automation |
| 2 | `/security-audit` | Security audit | Security |
| 3 | `/firewall-setup` | Firewall config | Security |
| 4 | `/ssl-manager` | SSL certificates | Security |
| 5 | `/health-check` | Server status | Operations |
| 6 | `/monitor` | Real-time dashboard | Monitoring |
| 7 | `/alerting` | Alert rules | Monitoring |
| 8 | `/system-report` | Reports | Operations |
| 9 | `/config-manager` | Config versioning | Operations |
| 10 | `/log-analyzer` | Log analysis | Debug |
| 11 | `/iot-debug` | ESP32 debug | Debug |
| 12 | `/fix-common` | Auto-fix issues | Auto-fix |
| 13 | `/deployment` | Deploy | DevOps |
| 14 | `/test-runner` | Run tests | Quality |
| 15 | `/device-provision` | New ESP32 | DevOps |
| 16 | `/firmware-update` | Firmware OTA | DevOps |
| 17 | `/backup` | Database backup | Maintenance |
| 18 | `/update` | Dependency updates | Maintenance |
| 19 | `/database-migrate` | Schema migrations | Maintenance |
| 20 | `/db-cleanup` | Database vacuum | Maintenance |
| 21 | `/cache-manager` | Redis cache | Maintenance |
| 22 | `/auto-scale` | Scale resources | Automation |
| 23 | `/metrics-export` | Prometheus export | Monitoring |
| 24 | `/api-gateway` | Rate limiting | Operations |
| 25 | `/user-manager` | User management | Operations |
| 26 | `/load-test` | Load testing | Quality |

## Usage

```bash
# Automation orchestration
/scheduler

# Security
/security-audit
/firewall-setup
/ssl-manager

# Operations
/health-check
/monitor
/alerting
/system-report
/config-manager
/api-gateway
/user-manager

# Debug
/log-analyzer
/iot-debug
/fix-common

# DevOps
/deployment
/test-runner
/device-provision
/firmware-update

# Maintenance
/backup
/update
/database-migrate
/db-cleanup
/cache-manager
/auto-scale

# Monitoring
/metrics-export

# Quality
/load-test
```

## Traffic Scheduler

- Scheduler is integrated under: Skill Management for EcoSynTech/scheduler/
- Uses config/scheduler.json to schedule skills
- Run: node scheduler-runner.js (or run via npm script)

## Automation Coverage: 96%

| Area | Skills | Coverage |
|------|--------|-----------|
| Security | 3 | 98% |
| Operations | 7 | 95% |
| Debug | 3 | 90% |
| DevOps | 4 | 95% |
| Maintenance | 5 | 95% |
| Monitoring | 2 | 90% |
| Quality | 2 | 90% |

**Overall: 96% automation**
