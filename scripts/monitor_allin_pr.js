#!/usr/bin/env node
"use strict";
// Simple monitor for All-In PR status on main
// Requires: GITHUB_TOKEN (repo scope) in env, or run in CI with secret
// Use global fetch (Node 18+) without extra dependency

async function main() {
  const owner = 'ecosyntech68vn';
  const repo = 'Ecosyntech-web';
  const headRef = 'final-all-in';
  const baseRef = 'main';
  const token = process.env.GITHUB_TOKEN || process.env.PERSONAL_TOKEN;
  if (!token) {
    console.error('GITHUB_TOKEN is required to monitor PR status.');
    process.exit(1);
  }

  const headParam = `${owner}:${headRef}`;
  const apiList = `https://api.github.com/repos/${owner}/${repo}/pulls?state=open&head=${encodeURIComponent(headParam)}&base=${encodeURIComponent(baseRef)}`;
  const headers = { 'Accept': 'application/vnd.github+json', 'Authorization': `Bearer ${token}` };

  const maxAttempts = 360; // about 60 minutes at 10s interval
  const delayMs = 10000;

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const r = await fetch(apiList, { headers });
      const prs = await r.json();
      if (Array.isArray(prs) && prs.length > 0) {
        const pr = prs[0];
        const prNum = pr.number;
        // Check status of checks
        const checksRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNum}/checks`, { headers });
        const checks = await checksRes.json();
        const statuses = (checks.check_runs || []).map(cr => cr.conclusion || cr.status);
        const allPassed = statuses.length === 0 || statuses.every(s => s === 'success' || s === 'completed' && s === 'success');
        // If there are checks and all passed, consider ready to merge
        if (allPassed) {
          console.log(`PR #${prNum} (${headRef} -> ${baseRef}) is ready to merge with all checks passed.`);
          console.log(`URL: ${pr.html_url}`);
          process.exit(0);
        } else {
          console.log(`PR #${prNum}: waiting for all checks to pass...`);
        }
      } else {
        console.log('No open All-In PR found yet. Waiting...');
      }
    } catch (e) {
      console.error('Error while polling PR status:', e?.message || e);
    }
    await new Promise(r => setTimeout(r, delayMs));
  }
  console.error('Timed out waiting for PR status to become ready.');
  process.exit(1);
}

main().catch(err => {
  console.error('monitor_allin_pr failed:', err);
  process.exit(2);
});
