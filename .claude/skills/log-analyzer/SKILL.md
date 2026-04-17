---
name: log-analyzer
description: "Analyze logs and find issues in EcoSynTech system"
user-invocable: true
agent: explore
---

# Log Analyzer Skill for EcoSynTech-web

Analyze system logs to identify errors, warnings, and issues.

## 1. Error Logs
Search for patterns in logs/ directory:
- Error messages
- Stack traces
- Uncaught exceptions
- Failed API calls

## 2. Security Events
- Failed authentication attempts
- Invalid webhook signatures
- Rate limit violations
- Suspicious requests

## 3. Performance Issues
- Slow queries
- Timeout errors
- High memory usage
- CPU spikes

## 4. IoT-Specific Events
- Device disconnections
- Failed MQTT messages
- Sensor data gaps
- Device errors

## 5. Recent Activity
Check logs from last 24 hours:
- Error frequency
- Warning frequency  
- Unique error types

Execute log analysis:

```bash
# Find errors
grep -ri "error" logs/ | tail -50

# Find warnings  
grep -ri "warn" logs/ | tail -20

# Find crashes
grep -ri "crash\|fatal\|exception" logs/

# Recent critical
tail -100 logs/*.log | grep -i "crit\|err"
```

Provide summary:
```
## Log Analysis Results

### Errors Found: X
- Error type 1: count
- Error type 2: count

### Warnings: X

### Security Events: X

### Top Issues
1. Issue: count occurrences
2. Issue: count occurrences

### Recommended Actions
- Fix X within 24h
- Monitor Y
```