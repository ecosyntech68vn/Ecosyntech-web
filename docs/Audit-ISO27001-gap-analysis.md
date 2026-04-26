Audit: ISO 27001 Gap Analysis - EcoSynTech Local Core

Scope
- System: EcoSynTech Local Core (on-prem) including API, dashboards, IoT, ML bootstrap, and supporting services.
- Timeframe: Current codebase state as of commit on feat/dashboard-stability-20260426.

Executive Summary
- The current architecture demonstrates alignment with several ISO27001 controls, especially in access control (RBAC), change management, incident response readiness (SOPs exist), and disaster recovery planning (DR SOP). However, gaps remain in certain areas such as formal HR security controls, supplier risk management, encryption at rest, TLS termination in production, and formal audit evidence collection.

ISO27001 Control Mapping (high level)
- A.5 Organization of information security
- A.6 Human resource security
- A.7 Asset management
- A.8 Access control
- A.9 Cryptography
- A.12 Operations security
- A.13 Communications security
- A.14 System acquisition, development and maintenance
- A.15 Supplier relationships
- A.16 Information security incident management
- A.17 Information security continuity
- A.18 Compliance

Findings and Observations (by control area)
- A.5 Organization of information security
 - Observed: Documentation exists (SOPs, risk registers); governance alignment in code reviews and change management. Gap: explicit ISMS policy ownership and Board-level approvals not explicit in code repo.
 - Recommendation: Document ISMS owner, governance structure, and periodic review cadence in a single policy doc; add Roles & Responsibilities (RACI) for security.

- A.6 HR Security
 - Observed: No explicit HR security onboarding/training evidence in codebase; security awareness not codified.
 - Recommendation: Introduce HR security policy and onboarding training; track training completion for developers and admins.

- A.7 Asset management
 - Observed: Asset inventory not clearly published in repo; some assets referenced in docs, but not a formal Asset Register.
 - Recommendation: Create an Asset Register (hardware, software, data) with owner, classification, and retention.

- A.8 Access control
 - Observed: RBAC implemented in codebase; admin routes protected; server uses RBAC guards. Evidence: src/routes/rbac.js, src/routes/admin.js, and token-based auth.
 - Gaps: No unified access policy for all micro modules; MFA not implemented.
 - Recommendation: Draft global access policy; enforce MFA in production, and add a compatibility test to ensure all new endpoints require RBAC.

- A.9 Cryptography
 - Observed: TLS termination not shown in app; token-based auth uses JWTs, but no explicit data encryption at rest in DB.
 - Recommendation: Ensure TLS termination (via reverse proxy), enable encryption at rest if sensitive data stored, review in a future microservice redesign.

- A.12 Operations security
 - Observed: Helmet and rate-limiting are configured; logging exists but no structured correlation IDs in logs.
 - Recommendation: Add correlation IDs (X-Request-Id) consistently, and standardize log formats; introduce log retention policy.

- A.13 Communications security
 - Observed: No explicit TLS config in app; rely on reverse proxy; no direct TLS configuration in code.
 - Recommendation: Document TLS policy and ensure reverse proxy certificate management; test TLS in staging.

- A.14 System acquisition, development and maintenance
 - Observed: Code base uses standard SDLC with tests; security-focused SOPs present. Gap: no explicit secure SDLC policy; static/dynamic code analysis not automated in CI beyond lint/typecheck.
 - Recommendation: Integrate static/dynamic testing, SAST/DAST steps in CI; require secure coding guidelines.

- A.15 Supplier relationships
 - Observed: Third-party libraries are used; no explicit supplier risk management policy.
 - Recommendation: Introduce supplier risk policy; keep SBOMs and security notices for dependencies.

- A.16 Information security incident management
 - Observed: Incidents are discussed via SOPs and test flows; no formal incident response runbooks in code.
 - Recommendation: Implement a formal IR runbook with escalation paths and post-incident review; ensure logging captures incident events.

- A.17 Information security continuity
 - Observed: DR SOP exists; no demonstrable test of DR in production-like environments.
 - Recommendation: Schedule DR exercises; document outcomes and update DR plan.

- A.18 Compliance
 - Observed: Documentation exists (RISK_REGISTER.md, ISMS docs); evidence of compliance activities varied.
 - Recommendation: Establish formal compliance evidence library and audit schedule; map controls to evidence.

Remediation Plan (high priority to low)
- Short term (0-4 weeks):
  - Add request-id correlation (implemented as part of this audit) and standardize log formats (A.12).
  - Create an Asset Register (A.7).
  - Draft an HR Security policy (A.6).
  - Implement TLS/secure communication guidance (A.13).
  - Document a formal Change Management policy (A.5, A.14).
- Medium term (1-3 months):
  - Implement MFA guidance for admin endpoints and add tests (A.9, A.8).
  - Integrate SAST/DAST into CI (A.14).
  - Implement DR test plan and schedule (A.17).
  - Introduce Supplier Risk policy and SBOM management (A.15).
- Long term (3-6 months):
  - Build a consolidated ISMS policy and perform a formal internal audit.
  - Adopt a full docs portal (already implemented as mini portal) and versioned policy library.

Evidence references (e.g.)
- RBAC definitions: src/routes/rbac.js, src/routes/admin.js, src/security/security.js
- Logging: src/config/logger.js, server.js logs (now include request id)
- DR SOP: docs/SOPs/Disaster-Recovery.md
- Audit/SOC evidence: docs/RISK_REGISTER.md, ISMS related docs in docs/ISMS/ and docs/ISMS_POLICY.md

Next Steps
- Implement the remediation tasks in a staged plan and update the audit report as tasks are completed.
- Run the ISO27001 gap-analysis again after applying fixes to confirm residual risk levels drop.
Phase 1 Deliverables (Baseline)
- ISO27001 Gap Analysis: identify gaps across A.5 - A.18 with risk rating and remediation plan.
- Asset Register skeleton: docs/ASSET_REGISTER.md with fields and owner mappings.
- HR Security Policy skeleton: docs/HR_SECURITY_POLICY.md covering onboarding/offboarding, training, access control.
- ISO27001 SoA Template: docs/ISO27001_SOA_TEMPLATE.md in place with mapping guidance.
- Audit Evidence skeleton: docs/Audit-Evidence-Skeleton.md (to be added if needed) or update existing evidence plan.
- Phase 1 plan and backlog notes (this doc updated to guide Phase 2).
