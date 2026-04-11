All-in Release 2.0.0
EcoSynTech IoT Backend All-in Release summary and deployment guide

What’s included
- PR automation: automatically create PRs and enable auto-merge on CI success
- Bootstrap: non-interactive bootstrap that can trigger PR automation after setup
- Docker-based deployment: Dockerfile + docker-compose.yml for customer deployments
- Customer deployment runbook: docs/customer-deployment.md
- Bundle packaging: scripts/package-customer-bundle.sh to generate ready-to-ship bundles
- End-to-end tests: extended test suites for auth, sensors, devices, rules, history, alerts, export/import
- Webhook signing tests: verify webhook payload signing (sensor-alert, device-status, rule-triggered, schedule-run)
- Token expiration tests: verify token expiry handling (TokenExpiredError)
- CI/CD: GitHub Actions ci.yml and auto-merge.yml to lint, test, build and auto-merge PRs
- Final patch includes all changes to run in customer environments (Dockerized or local)

How to use (high level)
- To deploy on customer environment, use Docker Compose: docker-compose up -d
- For non-Docker, bootstrap and run npm start after setting env vars in .env
- Use PR automation to create a PR from release branch and enable auto-merge on CI success
- Use the included bundle script to generate customer deployment bundles

Changelog (highlights)
- Added: all-in end-to-end tests
- Added: Docker packaging and docker-compose
- Added: PR auto-merge tooling and bootstrap automation
- Added: Webhook signing and token expiry tests
- Added: Customer deployment docs
- Added: Release packaging script and integration points for customer deployment

Notes
- Secrets are not stored in repository. Use CI secrets or secret stores for JWT_SECRET, WEBHOOK_SECRET, and GITHUB_TOKEN if using automation.
- Auto-merge depends on CI checks (lint, test, build) passing and no conflicts.
- This release is designed for customer provisioning and easy bootstrap in production-like environments.
