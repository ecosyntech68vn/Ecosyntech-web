# AI_EVIDENCE_PACK.md
# Evidence Pack for ISO 27001:2022 AI/ML Controls (A.14)
# Version: 6.0.0 | Date: 2026-04-23 | Owner: AI Ops Lead

---

## Purpose
This document serves as the primary evidence repository for ISO 27001:2022 A.14 AI/ML Operations controls in EcoSynTech FarmOS. It cross-references actual implementation artifacts, test results, and policy documents.

---

## Evidence Index

### A.14.1 – AI Decision Logging

| Evidence ID | Description | Location | Date |
|-------------|-------------|----------|------|
| **E-A14.1-01** | SmartAutomationEngine decision logging code | src/services/smartAutomationEngine.js:decisionLogging() | 2026-04-23 |
| **E-A14.1-02** | Audit log format specification | SOP_AI_GOVERNANCE.md §SOP-E-05 | 2026-04-23 |
| **E-A14.1-03** | Winston logger configuration | src/config/logger.js | 2026-04-23 |
| **E-A14.1-04** | Sample AI decision log entries | logs/ai_bootstrap.log (runtime) | Ongoing |
| **E-A14.1-05** | Unit tests for decision logging | __tests__/smart_automation.test.js | 2026-04-23 |

**Verification**: Check logs/ directory for JSON-formatted AI decision entries with fields: timestamp, event, model, method, output, confidence.

---

### A.14.2 – AI Lifecycle Management

| Evidence ID | Description | Location | Date |
|-------------|-------------|----------|------|
| **E-A14.2-01** | Model loader with versioning | src/bootstrap/modelLoader.js | 2026-04-23 |
| **E-A14.2-02** | Model inventory registry | models/registry.json | 2026-04-23 |
| **E-A14.2-03** | Labels file (model class list) | models/labels.txt | 2026-04-23 |
| **E-A14.2-04** | Bootstrap script with lifecycle hooks | scripts/setup-models.sh | 2026-04-23 |
| **E-A14.2-05** | SOP-E-04: Bootstrap & Model Management | SOP_AI_GOVERNANCE.md §SOP-E-04 | 2026-04-23 |

**Verification**: 
- List models/registry.json for active models with versions
- Verify bootstrap logs in logs/ai_bootstrap.log show model load/unload events

---

### A.14.3 – Data Governance for AI

| Evidence ID | Description | Location | Date |
|-------------|-------------|----------|------|
| **E-A14.3-01** | Data Retention Policy | DATA_RETENTION_POLICY.md | 2026-04-21 |
| **E-A14.3-02** | Data classification in ISMS | ISMS_POLICY.md §4 | 2026-04-23 |
| **E-A14.3-03** | Sensor data handling (privacy) | src/middleware/audit-tamper-proof.js | 2026-04-23 |
| **E-A14.3-04** | Input sanitization for AI inputs | src/middleware/errorHandler.js | 2026-04-23 |
| **E-A14.3-05** | AI data minimization (no PII in logs) | SOP_AI_GOVERNANCE.md §SOP-E-05 | 2026-04-23 |
| **E-A14.3-06** | IoT Data Taxonomy | IoT_DATA_TAXONOMY.md | 2026-04-23 |
| **E-A14.3-07** | AI Telemetry Governance Service | src/services/aiTelemetry.js | 2026-04-23 |
| **E-A14.3-08** | Data quality rules (8 sensor types) | src/services/aiTelemetry.js:DATA_QUALITY_RULES | 2026-04-23 |
| **E-A14.3-09** | Data quality assessment with scoring | src/services/aiEngine.js:predictIrrigation() | 2026-04-23 |
| **E-A14.3-10** | AI prediction audit trail (DB) | migrations/007_ai_telemetry_governance.sql | 2026-04-23 |
| **E-A14.3-11** | Governance endpoints | src/routes/ai.js:GET /governance/* | 2026-04-23 |
| **E-A14.3-12** | AI Telemetry tests | __tests__/ai_telemetry.test.js (22 tests) | 2026-04-23 |

**Verification**:
- Review IoT_DATA_TAXONOMY.md for sensor data classification
- Check GET /api/ai/governance/report for data governance status
- Check GET /api/ai/governance/audit for prediction audit trail
- Verify ai_prediction_audit table exists and is populated
- Run `POST /api/ai/governance/validate` with test sensor data

---

### A.14.4 – Security of AI Assets

| Evidence ID | Description | Location | Date |
|-------------|-------------|----------|------|
| **E-A14.4-01** | RBAC auth middleware for AI endpoints | src/middleware/auth.js:requireRole() | 2026-04-23 |
| **E-A14.4-02** | Bootstrap API protected by auth | src/bootstrap/bootstrap_api.js | 2026-04-23 |
| **E-A14.4-03** | Model files excluded from git | .gitignore | 2026-04-23 |
| **E-A14.4-04** | HTTPS/TLS enforcement | server.js:helmet + cert configs | 2026-04-23 |
| **E-A14.4-05** | Rate limiting on AI endpoints | server.js:rateLimit | 2026-04-23 |
| **E-A14.4-06** | Access control for models (path-based) | src/bootstrap/modelLoader.js | 2026-04-23 |
| **E-A14.4-07** | SOP-E-04 §5: Security Controls | SOP_AI_GOVERNANCE.md §SOP-E-04 | 2026-04-23 |
| **E-A14.4-08** | Data hash for input lineage | src/services/aiTelemetry.js:hashData() | 2026-04-23 |
| **E-A14.4-09** | Input enrichment with classification | src/services/aiTelemetry.js:enrichSensorData() | 2026-04-23 |

**Verification**: 
- Verify /api/bootstrap/* returns 401 without token
- Verify .gitignore excludes .onnx and large .tflite files
- Check RBAC logs for model management access attempts

---

### A.14.5 – AI Incident Response

| Evidence ID | Description | Location | Date |
|-------------|-------------|----------|------|
| **E-A14.5-01** | AI Incident Response SOP | SOP_AI_GOVERNANCE.md §SOP-E-06 | 2026-04-23 |
| **E-A14.5-02** | General Incident Response | INCIDENT_RESPONSE_SOP.md | 2026-04-23 |
| **E-A14.5-03** | AI risk register entries | RISK_REGISTER.md §AI/ML Risks | 2026-04-23 |
| **E-A14.5-04** | Telegram alerting service | src/services/telegramAlertService.js | 2026-04-23 |
| **E-A14.5-05** | Escalation matrix (SOP-E-06 §4) | SOP_AI_GOVERNANCE.md §SOP-E-06 | 2026-04-23 |

**Verification**: Review INCIDENT_RESPONSE_SOP.md for AI-specific section. Check logs for recent incident response actions.

---

### A.14.6 – Drive-Hosted Model Bootstrap

| Evidence ID | Description | Location | Date |
|-------------|-------------|----------|------|
| **E-A14.6-01** | Bootstrap script with Drive support | scripts/setup-models.sh | 2026-04-23 |
| **E-A14.6-02** | Drive download function (2-step auth) | scripts/setup-models.sh §download_drive() | 2026-04-23 |
| **E-A14.6-03** | Runtime bootstrap with Drive fallback | src/bootstrap/modelLoader.js | 2026-04-23 |
| **E-A14.6-04** | Bootstrap API (status/configure/reload) | src/bootstrap/bootstrap_api.js | 2026-04-23 |
| **E-A14.6-05** | Bootstrap tests | __tests__/bootstrap_ai.test.js | 2026-04-23 |
| **E-A14.6-06** | Bootstrap UI | public/bootstrap.html | 2026-04-23 |

**Verification**:
- Run `AI_SMALL_MODEL=1 AI_LARGE_MODEL=0 npm run setup-models` → small model loaded
- Run `AI_LARGE_MODEL=1 AI_ONNX_URL="https://..." npm run setup-models` → large model download attempted
- Check logs/ai_bootstrap.log for bootstrap events

---

## Evidence Artifact Inventory

### Policy Documents
| Artifact | File | Version | Date |
|----------|------|---------|------|
| ISMS Policy | ISMS_POLICY.md | 1.1.0 | 2026-04-23 |
| Risk Register | RISK_REGISTER.md | 1.1.0 | 2026-04-23 |
| AI Governance SOP | SOP_AI_GOVERNANCE.md | 6.0.0 | 2026-04-23 |
| Data Retention Policy | DATA_RETENTION_POLICY.md | - | 2026-04-21 |
| Incident Response SOP | INCIDENT_RESPONSE_SOP.md | - | 2026-04-23 |

### Source Code
| Artifact | File | Language | Lines |
|----------|------|----------|-------|
| Model Loader | src/bootstrap/modelLoader.js | JavaScript | 236 |
| Bootstrap API | src/bootstrap/bootstrap_api.js | JavaScript | 55 |
| Bootstrap Script | scripts/setup-models.sh | Bash | ~70 |
| AI Predictor (TFLite) | src/services/ai/tfliteDiseasePredictor.js | JavaScript | 94 |
| AI Predictor (ONNX) | src/services/ai/lstmIrrigationPredictor.js | JavaScript | 102 |
| Bootstrap CLI | bin/bootstrap-ai.js | JavaScript | 137 |
| AI Engine | src/services/aiEngine.js | JavaScript | 476 |
| AI Telemetry Service | src/services/aiTelemetry.js | JavaScript | 312 |

### Tests
| Test Suite | File | Coverage |
|------------|------|---------|
| Bootstrap script tests | __tests__/bootstrap_ai.test.js | small+large toggle |
| Bootstrap API tests | __tests__/bootstrap_api.test.js | applyConfig/reload |
| Smart Automation tests | __tests__/smart_automation.test.js | decision logging |
| AI Manager tests | __tests__/ai_manager.test.js | 17 agent tests |
| AI Telemetry tests | __tests__/ai_telemetry.test.js | 22 tests |

### Configuration
| Artifact | File | Purpose |
|---------|------|---------|
| Model Registry | models/registry.json | Inventory of AI models |
| Environment Config | .env.example | AI_* vars documented |
| Package Scripts | package.json | setup-models, bootstrap-ai |

---

## Audit Checklist: A.14 AI/ML Operations

Use this checklist during internal or external ISO 27001 audits.

| Check | Question | Evidence | Status |
|-------|---------|----------|--------|
| **A.14.1** | Are AI decisions logged with context? | E-A14.1-01, E-A14.1-04 | ✅ Implemented |
| **A.14.2** | Are AI models versioned and tracked? | E-A14.2-01, E-A14.2-02 | ✅ Implemented |
| **A.14.3** | Is AI training/prediction data governed? | E-A14.3-01, E-A14.3-05 | ✅ Implemented |
| **A.14.4** | Are AI assets access-controlled? | E-A14.4-01, E-A14.4-06 | ✅ Implemented |
| **A.14.5** | Is AI incident response defined? | E-A14.5-01, E-A14.5-05 | ✅ Implemented |
| **A.14.6** | Is third-party model download secured? | E-A14.6-01, E-A14.6-02 | ✅ Implemented |

---

## Cross-Reference: A.14 ↔ Other Annex A Controls

| A.14 Control | Related Controls | Notes |
|-------------|------------------|-------|
| A.14.1 AI decision logging | A.12.4 Event logging | AI decisions are audit events |
| A.14.2 AI lifecycle | A.8.1 Asset management | Models are assets |
| A.14.3 AI data governance | A.8.2 Information classification | AI data classified as Internal |
| A.14.4 AI security | A.8.9, A.8.12, A.9 | Model access = asset access + RBAC |
| A.14.5 AI incident response | A.13 Incident management | AI incidents tracked in incident register |
| A.14.6 Drive bootstrap | A.8.23 Secure authentication | Drive download has two-step auth |

---

## Audit Timeline

| Activity | Date | Auditor |
|----------|------|---------|
| Evidence pack initial compilation | 2026-04-23 | AI Ops Lead |
| Internal audit | 2026-05-15 | ISMS Manager |
| External audit (planned) | 2026-10-23 | External Auditor |
| Annual review | 2027-04-23 | ISMS Manager |

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 6.0.0 | 2026-04-23 | AI Ops Lead | Initial evidence pack for A.14 controls |
| 6.1.0 | 2026-04-23 | AI Ops Lead | Phase 2: add IoT telemetry governance (E-A14.3-06 to 12, E-A14.4-08 to 09), 22 telemetry tests, aiEngine and aiTelemetry service artifacts |

---

*Document Classification: Internal – Controlled*
*Owner: AI Ops Lead | ISMS Manager | Review Cycle: 6 months*
*Next Review: 2026-10-23*