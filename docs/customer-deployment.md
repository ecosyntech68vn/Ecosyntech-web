# Customer Deployment Guide

This guide describes how to deploy Ecosyntech IoT Backend in a customer environment, including Docker-based deployment, bootstrap steps for first-run, and how to run tests and verify health.

Prerequisites
- Node.js 18+ (for local dev) or Docker for containerized deployment
- Git access to the Ecosyntech-web repository
- Access to a GitHub token with repo scope if using PR automation
- Basic knowledge of environment management and secret storage

1. Quick Docker-based deployment
- Option A: Docker Compose (recommended for customers)
  1) Prepare environment variables
     - JWT_SECRET: long random secret
     - WEBHOOK_SECRET: long random secret
     - MQTT_BROKER_URL: optional; if not used, leave empty
     - DB_PATH: defaults to /data/ecosyntech.db inside the container
  2) Create a .env file or pass via docker-compose envs
  3) Start
     - docker-compose up -d
     - Service will start on port 3000 by default
  4) Verify Health
     - curl http://localhost:3000/api/health
  5) Optional: bootstrap (non-interactive) to auto-create .env and tests
     - Set NON_INTERACTIVE=1 and run bootstrap (you can expose it through a wrapper script in customer tooling)

- Option B: Native Node.js deployment (non-container)
  1) Install Node.js 18+ and npm
  2) Install dependencies: npm ci
  3) Create a local .env with required keys (JWT_SECRET, WEBHOOK_SECRET, MQTT_BROKER_URL, etc.)
  4) Run: npm start
  5) Verify Health as above

2. Bootstrap and PR automation (optional, for CI/CD integration)
- Bootstrap to set up environment and dependencies:
  - NON_INTERACTIVE=1 node bootstrap.js
- PR automation (optional): create PR and enable auto-merge using the provided script (pr-auto-merge.js).
- If you want to auto-create PRs in customer CI, you can call:
  - GITHUB_TOKEN=... PR_HEAD=feature/full-test-ci PR_BASE=main node scripts/pr-auto-merge.js

3. Security and runbook
- Do not commit secrets (JWT_SECRET, WEBHOOK_SECRET) to repository. Use environment secrets or a dedicated secret store.
- Rotate keys periodically and update Docker/Env accordingly.
- Runbooks: add a separate runbook for customer onboarding and troubleshooting.

4. Verification and tests
- Run local tests: npm test
- Run full checks: npm run all (lint, test, build)
- For CI, rely on GitHub Actions workflow: lint, test, build, and auto-merge on PRs as configured.

5. Rollback and troubleshooting
- If docker-compose fails to bring up, check container logs: docker-compose logs
- Check health endpoint and logs for errors and misconfigurations

Appendix: Secrets handling
- Do not store secrets in repo. Use GitHub Secrets, environment variables, or a secret management tool.
