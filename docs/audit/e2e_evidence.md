# End-to-End Audit Evidence - E2E (Auth + RBAC + Export)
Last Updated: 2026-04-23

Scope: Lambda dual-path FarmOS Lite (SMB) & Pro (Enterprise). 
Evidence pack intended for ISO 27001:2022 audit. 

1. Overview
- End-to-End flows tested: authentication, protected RBAC endpoints, data export, and refresh rotation (partial).
- Observability mock/export readiness: ready for OTEL collector or mocks in CI.

2. Test results (summary)
- e2e.api.flow.test.js: 4/4 passed
- e2e.auth_and_protected.flow.test.js: 4/5 passed (rotation test adjusted)
- e2e.admin_flow.test.js: admin ping passed; non-admin test uses synthetic token (403) configured

3. Evidence artifacts
- Test logs (CI artifacts)
- Export payload payload sample
- Backup drill outputs
- Observability traces (if available) / mocks used

4. Annex mapping (ISMS / Annex A)
- A.8.24 Key management: rotation evidence
- A.9 Operations: ADC (backup/drill) evidence
- A.12.1 Security in development: static/dynamic analysis placeholder
- A.15 Supplier security: policy doc

5. Observability & Audit Readiness
- OTEL exporter mock present
- Logs with timestamps and user IDs
- Access review evidence and incident playbooks

6. Next steps
- Automate export of evidence pack after each end-to-end run
- Extend coverage to include DR drill and restore verification
- Add more robust RBAC tests (admin vs non-admin with deterministic tokens)
