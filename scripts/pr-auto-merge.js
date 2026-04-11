#!/usr/bin/env node
'use strict';
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function main() {
  // Determine owner/repo from git remote
  let remote = '';
  try {
    remote = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
  } catch (e) {
    console.error('Cannot read git remote.origin.url. Ensure you are inside a git repo.');
    process.exit(1);
  }

  let owner = null, repo = null;
  if (remote.startsWith('git@github.com:')) {
    const ref = remote.split(':')[1].replace(/\.git$/, '');
    [owner, repo] = ref.split('/');
  } else if (remote.startsWith('https://github.com/')) {
    const ref = remote.replace(/^https:\/\/github.com\//, '').replace(/\.git$/, '');
    [owner, repo] = ref.split('/');
  }

  if (!owner || !repo) {
    console.error('Unable to parse owner/repo from remote. Got: ', remote);
    process.exit(1);
  }

  // GitHub token (env or config file)
  let token = process.env.GITHUB_TOKEN;
  // try to read from config file prconfig.json if exists
  if (!token) {
    const configPath = path.resolve(process.cwd(), 'prconfig.json');
    if (fs.existsSync(configPath)) {
      try {
        const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (cfg.token) token = cfg.token;
      } catch (e) {
        // ignore parse errors
      }
    }
  }
  // Fallback: try reading token from local secrets files (for air-gapped or quick-start scenarios)
  if (!token) {
    const secretPaths = [
      path.resolve(process.cwd(), 'secrets', 'github_token'),
      path.resolve(process.cwd(), 'secrets', 'token.txt'),
      path.resolve(process.cwd(), 'token.txt')
    ];
    for (const p of secretPaths) {
      try {
        if (fs.existsSync(p)) {
          const content = fs.readFileSync(p, 'utf8').trim();
          if (content) {
            token = content;
            console.log(`Using GitHub token from secret: ${p}`);
            break;
          }
        }
      } catch (e) {
        // ignore read errors and continue looking
      }
    }
  }
  if (!token) {
    // Fallback: prompt for token if in interactive mode
    const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout });
    token = await new Promise(resolve => {
      rl.question('GitHub token (PAT) with repo scope: ', ans => {
        rl.close();
        resolve(ans);
      });
    });
  }
  if (!token) {
    console.error('GitHub token is required. Set GITHUB_TOKEN env, provide prconfig.json token, or input interactively.');
    process.exit(1);
  }

  // PR details (can be overridden by env vars for automation)
  const head = process.env.PR_HEAD || 'feature/full-test-ci';
  const base = process.env.PR_BASE || 'main';
  const title = process.env.PR_TITLE || 'feat: End-to-End Test Suite + CI/CD';
  const body = process.env.PR_BODY || 'End-to-end tests, webhook tests, seed data, and CI/CD pipeline implemented.';

  // Create PR
  const api = `https://api.github.com/repos/${owner}/${repo}/pulls`;
  const payload = { title, head, base, body };
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

  const pr = await resp.json();
  if (resp.status !== 201) {
    console.error('PR creation failed:', pr);
    process.exit(1);
  }
  console.log(`PR created: ${pr.html_url} (#${pr.number})`);

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
