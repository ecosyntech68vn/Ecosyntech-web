---
name: security-audit
description: "Run comprehensive security audit for EcoSynTech IoT backend"
user-invocable: true
agent: explore
---

# Security Audit Skill for EcoSynTech-web

Perform a thorough security audit of the EcoSynTech IoT backend system. Focus on:

## 1. Environment Variables
- Check .env file for exposed secrets (never commit .env)
- Verify HMAC_SECRET, JWT_SECRET, WEBHOOK_SECRET are set
- Check for hardcoded credentials

## 2. Authentication & Authorization
- Verify webhook signature verification in src/utils/envelope.js
- Check JWT implementation in src/middleware/
- Review role-based access control

## 3. API Security
- CORS configuration (should be restricted in production)
- Rate limiting implementation
- Input validation

## 4. Dependencies
- Run npm audit for vulnerabilities
- Check for known vulnerable packages
- Verify secure versions

## 5. SSL/TLS
- Check HTTPS enforcement
- HSTS headers

## 6. Database
- SQL injection prevention
- Connection string security
- Backup encryption status

## 7. IoT-Specific
- MQTT broker authentication
- Device credential management
- Webhook secret validation

Execute the following checks in order and report findings in structured format.

Output format:
```
## Security Audit Results

### Critical Issues
- [ ] Issue 1: description

### Medium Issues  
- [ ] Issue 2: description

### Recommendations
- [ ] Recommendation 1
```