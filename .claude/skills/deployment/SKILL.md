---
name: deployment
description: "Deploy and manage EcoSynTech-web production"
user-invocable: true
agent: explore
---

# Deployment Skill for EcoSynTech-web

Deploy and manage EcoSynTech IoT backend production.

## 1. Pre-Deployment Checklist
- [ ] All tests passing (npm test)
- [ ] Lint clean (npm run lint)
- [ ] Environment variables set
- [ ] Database backup created
- [ ] Rollback plan ready

## 2. Build Process
```bash
# Install dependencies
npm ci --production

# Run tests
npm test

# Build (if needed)
npm run build
```

## 3. Docker Deployment
```bash
# Build image
docker build -t ecosyntech-web:latest .

# Run container
docker run -d -p 3000:3000 --env-file .env.production ecosyntech-web:latest
```

## 4. Health Verification
After deployment, verify:
- GET /health returns 200
- GET /metrics returns 200
- Database queries work
- MQTT connected

## 5. Rollback Procedure
If issues occur:
```bash
# Rollback to previous version
docker pull ecosyntech-web:previous-tag
docker stop ecosyntech-web && docker rm ecosyntech-web
docker run -d ... ecosyntech-web:previous-tag
```

## 6. Post-Deploy Monitoring
- Check error logs for 1 hour
- Monitor API response times
- Verify device data flow

Execute deployment steps in order and confirm each step before proceeding.

Provide deployment report:
```
## Deployment Report

### Pre-flight
- [x] Tests passed
- [x] Lint clean

### Deployment
- Status: SUCCESS/FAILED
- Version: X.X.X
- Docker image: tag

### Health Check
- /health: OK/FAIL
- /metrics: OK/FAIL

### Post-deploy
- Errors: X in 1h
- API latency: Xms
```