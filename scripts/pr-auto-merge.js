#!/usr/bin/env node
'use strict';
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function main() {
  // Owner/repo will be sourced from environment (GITHUB_REPOSITORY) or fallback to git remote below
  let owner, repo;
  if (process.env.GITHUB_REPOSITORY) {
    const parts = process.env.GITHUB_REPOSITORY.split('/');
    if (parts.length === 2) [owner, repo] = parts;
  }
  // If not found, try parsing remote URL (requires git repo)
  if (!owner || !repo) {
    let remote = '';
    try {
      remote = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
    } catch (e) {
      // Not a git repo in CI context; proceed to error later
    }
    if (remote) {
      if (remote.startsWith('git@github.com:')) {
        const ref = remote.split(':')[1].replace(/\.git$/, '');
        [owner, repo] = ref.split('/');
      } else if (remote.startsWith('https://github.com/')) {
        const ref = remote.replace(/^https:\/\/github.com\//, '').replace(/\.git$/, '');
        [owner, repo] = ref.split('/');
      }
    }
  }
  if (!owner || !repo) {
    console.error('Unable to parse owner/repo from environment or remote. Got:', process.env.GITHUB_REPOSITORY);
    process.exit(1);
  }

  // GitHub token: prefer GH_PAT_FOR_PR (PAT with repo scope)
  let token = process.env.GH_PAT_FOR_PR || process.env.GITHUB_TOKEN;
  // If no token, fail fast (no interactive prompts in CI)
  if (!token) {
    console.error('GitHub token is required. Set GH_PAT_FOR_PR or GITHUB_TOKEN environment variable.');
    process.exit(1);
  }

  // PR details (can be overridden by env vars for automation)
  const head = process.env.PR_HEAD || 'feature/full-test-ci';
  const base = process.env.PR_BASE || 'main';
  const title = process.env.PR_TITLE || 'feat: End-to-End Test Suite + CI/CD';
  const body = process.env.PR_BODY || 'End-to-end tests, webhook tests, seed data, and CI/CD pipeline implemented.';

  // Idempotent PR: check if an open PR already exists for this head/base
  let existingPR = null;
  try {
    const listApi = `https://api.github.com/repos/${owner}/${repo}/pulls?state=open&head=${encodeURIComponent(head)}&base=${encodeURIComponent(base)}`;
    if (typeof fetch === 'function') {
      const respList = await fetch(listApi, {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github+json' }
      });
      const prs = await respList.json();
      if (Array.isArray(prs) && prs.length > 0) existingPR = prs[0];
    } else {
      // Basic fallback: ignore if cannot fetch in this environment
    }
  } catch (e) {
    // Ignore network errors in CI; we'll try to create PR anyway
  }

  // Create or reuse PR (idempotent)
  const api = `https://api.github.com/repos/${owner}/${repo}/pulls`;
  const payload = { title, head, base, body };
  let pr = null;
  try {
    if (existingPR) {
      pr = existingPR;
      console.log(`Using existing PR: ${pr.html_url} (#${pr.number})`);
    } else {
      // Create PR
      let resp;
      try {
        if (typeof fetch === 'function') {
          resp = await fetch(api, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'Accept': 'application/vnd.github+json'
            },
            body: JSON.stringify(payload)
          });
        } else {
          // Fallback using https module
          const https = require('https');
          const { URL } = require('url');
          const urlObj = new URL(api);
          const options = {
            hostname: urlObj.hostname,
            port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
            path: urlObj.pathname + (urlObj.search || ''),
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'Accept': 'application/vnd.github+json'
            }
          };
          const payloadStr = JSON.stringify(payload);
          resp = await new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
              let data = '';
              res.on('data', (chunk) => (data += chunk));
              res.on('end', () => {
                resolve({ status: res.statusCode, text: data, json: () => JSON.parse(data) });
              });
            });
            req.on('error', reject);
            req.write(payloadStr);
            req.end();
          });
        }
      } catch (e) {
        console.error('Failed to create PR:', e.message);
        process.exit(1);
      }
      pr = await resp.json();
      if (resp.status !== 201) {
        console.error('PR creation failed:', pr);
        process.exit(1);
      }
      console.log(`PR created: ${pr.html_url} (#${pr.number})`);
    }
  } catch (e) {
    // fallthrough
  }
  // Notify via preferred channels (Telegram/Slack/GAS/Email)
  try {
    const { execSync } = require('child_process');
    const notifyEnv = {
      ...process.env,
      NOTIFY_EVENT: 'PR_CREATED',
      PR_URL: pr.html_url,
      PR_NUMBER: String(pr.number),
      PR_HEAD: head,
      PR_BASE: base
    };
    const notifyCmd = `node ${path.resolve(__dirname, 'notify.js')}`;
    execSync(notifyCmd, { stdio: 'inherit', env: notifyEnv });
  } catch (e) {
    console.error('Notifier invocation failed:', e?.message || e);
  }

  // Enable auto-merge via GraphQL (if possible)
  const prNodeId = pr.node_id || pr.id;
  if (prNodeId) {
    // Enable auto-merge (BEST EFFORT)
    const graphqlUrl = 'https://api.github.com/graphql';
    const q = `mutation enableAutoMerge($pullRequestId: ID!, $mergeMethod: MergeMethod!) {\n  enablePullRequestAutoMerge(input: {pullRequestId: $pullRequestId, mergeMethod: $mergeMethod}) {\n    pullRequest { number }\n  }\n}`;
    const vars = { pullRequestId: prNodeId, mergeMethod: 'MERGE' };
    try {
      let gresp;
      if (typeof fetch === 'function') {
        gresp = await fetch(graphqlUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ query: q, variables: vars })
        });
      } else {
        const https = require('https');
        const { URL } = require('url');
        const urlObj = new URL(graphqlUrl);
        const options = {
          hostname: urlObj.hostname,
          port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
          path: urlObj.pathname + (urlObj.search || ''),
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        };
        const payloadStr = JSON.stringify({ query: q, variables: vars });
        gresp = await new Promise((resolve, reject) => {
          const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
              resolve({ status: res.statusCode, text: data, json: () => JSON.parse(data) });
            });
          });
          req.on('error', reject);
          req.write(payloadStr);
          req.end();
        });
      }
      const gBody = await gresp.json();
      const autoMerged = gBody?.data?.enablePullRequestAutoMerge?.pullRequest?.number;
      if (autoMerged) {
        console.log(`Auto-merge enabled for PR #${autoMerged}`);
      } else {
        console.log('Auto-merge could not be enabled via GraphQL (check permissions).');
      }
    } catch (e) {
        console.log('GraphQL auto-merge call failed:', e.message);
    }
  } else {
    console.log('PR node_id not found; cannot enable auto-merge via GraphQL.');
  }
}

// Run
main().catch(err => {
  console.error('PR automation failed:', err);
  process.exit(1);
});
