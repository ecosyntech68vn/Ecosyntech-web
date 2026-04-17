# Scheduler UI & Deployment

This folder contains the scheduler runner and a lightweight UI to view current schedules.

- scheduler-runner.js: Node-based scheduler runner that loads config/scheduler.json and triggers skills via HTTP endpoints.
- config/scheduler.json: Predefined schedules and mappings to skills.
- ui/: Static web UI to display schedules (index.html, app.js).

How to deploy:
- Run scheduler: node scheduler-runner.js (in production, use systemd service).
- Serve UI: host the scheduler/ui directory via a web server (nginx/express).
- Ensure config file path is accessible to UI and scheduler runner.
