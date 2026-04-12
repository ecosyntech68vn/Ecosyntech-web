#!/usr/bin/env node
"use strict";
const https = require('https');
const { execSync } = require('child_process');

async function postReq(url, data, token) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const options = {
      method: 'POST',
      hostname: parsed.hostname,
      path: parsed.pathname + (parsed.search || ''),
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github+json'
      }
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(body || '{}') }); }
        catch (e) { resolve({ status: res.statusCode, body: body || '' }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

function getGitOwnerRepo() {
  const url = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
  if (url.startsWith('git@github.com:')) {
    const ref = url.split(':')[1].replace(/\.git$/, '');
    const [owner, repo] = ref.split('/');
    return { owner, repo };
  }
  if (url.startsWith('https://github.com/')) {
    const ref = url.replace(/^https:\/\/github.com\//, '').replace(/\.git$/, '');
    const [owner, repo] = ref.split('/');
    return { owner, repo };
  }
  throw new Error('Cannot parse GitHub owner/repo from origin URL');
}

async function main() {
  const token = process.env.GITHUB_TOKEN || process.env.PERSONAL_TOKEN;
  if (!token) { throw new Error('GITHUB_TOKEN missing in env'); }
  const { owner, repo } = getGitOwnerRepo();
  // PR config
  const head = process.env.PR_HEAD || 'final-all-in';
  const base = process.env.PR_BASE || 'main';
  const title = process.env.PR_TITLE || 'Release All-In 2.0.0';
  const body = process.env.PR_BODY || 'All-In release with PR automation, bootstrap, dockerization, runbook, and tests.';

  // Create PR
  const prUrl = `https://api.github.com/repos/${owner}/${repo}/pulls`;
  const prResp = await postReq(prUrl, { title, head, base, body }, token);
  if (prResp.status !== 201) {
    console.error('PR creation failed', prResp.status, prResp.body);
    process.exit(1);
  }
  const prNumber = prResp.body.number;
  console.log(`PR created: ${prResp.body.html_url} (#${prNumber})`);

  // Enable auto-merge via GraphQL if possible
  if (prResp.body.node_id) {
    try {
      const gql = `mutation enableAutoMerge($pullRequestId: ID!, $mergeMethod: MergeMethod!){
        enablePullRequestAutoMerge(input: {pullRequestId: $pullRequestId, mergeMethod: MERGE}){ clientMutationId }
      }`;
      const gqlUrl = `https://api.github.com/graphql`;
      const vars = { pullRequestId: prResp.body.node_id, mergeMethod: 'MERGE' };
      const g = await postReq(gqlUrl, { query: gql, variables: vars }, token);
      if (g.status === 200) {
        console.log('Auto-merge enabled via GraphQL (if permitted).');
      }
    } catch (e) {
      console.log('GraphQL auto-merge not available or not permitted:', e.message);
    }
  } else {
    console.log('No PR node_id found; cannot enable auto-merge via GraphQL.');
  }
  // Notifier is already wired in CI; this script focuses on PR creation and merge enablement
}

main().catch(err => {
  console.error('auto_allin.js failed:', err.message);
  process.exit(2);
});
