#!/usr/bin/env node
/* Consolidate Skills from multiple sources into a canonical skills directory */
const fs = require('fs');
const path = require('path');

const SOURCES = [
  '/root/.opencode/skills',
  '/root/.claude/skills'
];
const CANON_DIR = path.resolve(__dirname, '..', 'skills');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyIfNeeded(srcSkillDir, dstSkillDir) {
  const srcSkillMd = path.join(srcSkillDir, 'SKILL.md');
  if (!fs.existsSync(srcSkillMd)) return { copied: false, reason: 'Missing SKILL.md' };
  ensureDir(dstSkillDir);
  const dstSkillMd = path.join(dstSkillDir, 'SKILL.md');
  if (fs.existsSync(dstSkillMd)) {
    // Simple comparison: skip if contents identical (checksum-based could be added)
    const src = fs.readFileSync(srcSkillMd, 'utf8');
    const dst = fs.readFileSync(dstSkillMd, 'utf8');
    if (src === dst) {
      return { copied: false, reason: 'Already up-to-date' };
    }
  }
  // Always copy (overwrite) on dry-run or perform mode
  return { copied: true, dstSkillMd };
}

function main() {
  const doCopy = process.argv[2] === 'perform';
  ensureDir(CANON_DIR);
  const actions = [];
  for (const src of SOURCES) {
    if (!fs.existsSync(src)) continue;
    const skillNames = fs.readdirSync(src, { withFileTypes: true }).filter(d => d.isDirectory() && !d.name.startsWith('.')).map(d => d.name);
    for (const name of skillNames) {
      const srcSkillDir = path.join(src, name);
      const dstSkillDir = path.join(CANON_DIR, name);
      const res = copyIfNeeded(srcSkillDir, dstSkillDir);
      actions.push({ name, src: srcSkillDir, dst: dstSkillDir, ...res });
      if (res.copied && doCopy) {
        const srcMd = path.join(srcSkillDir, 'SKILL.md');
        const dstMd = path.join(dstSkillDir, 'SKILL.md');
        // Ensure destination directory exists and copy file
        ensureDir(dstSkillDir);
        fs.copyFileSync(srcMd, dstMd);
      }
    }
  }
  // Output results
  console.log('Consolidation plan:');
  actions.forEach(a => {
    if (a.copied) {
      console.log(`- [COPY] ${a.src} -> ${a.dst} (SKILL.md)`);
    } else {
      console.log(`- [SKIP] ${a.name} (reason: ${a.reason || 'unchanged'})`);
    }
  });
  if (doCopy) {
    console.log('Consolidation executed: files copied/overwritten in canonical skills directory.');
  } else {
    console.log('Dry-run complete. Run with: node scripts/consolidate-skills.js perform to apply changes.');
  }
}

if (require.main === module) {
  main();
}
