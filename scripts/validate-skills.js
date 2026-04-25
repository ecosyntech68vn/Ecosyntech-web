#!/usr/bin/env node
/* Simple skill validator: checks SKILL.md frontmatter exists and contains name/description. */
const fs = require('fs');
const path = require('path');

function validateSkill(skillPath) {
  const skillMd = path.join(skillPath, 'SKILL.md');
  if (!fs.existsSync(skillMd)) {
    return { ok: false, reason: 'Missing SKILL.md', path: skillMd };
  }

  const content = fs.readFileSync(skillMd, 'utf8');
  // Simple parser: look for the first frontmatter block delimited by ---
  const lines = content.split(/\r?\n/);
  if (lines[0].trim() !== '---') {
    return { ok: false, reason: 'Missing YAML frontmatter', path: skillMd };
  }
  let idx = 1;
  let name = null, description = null;
  while (idx < lines.length) {
    const line = lines[idx].trim();
    if (line === '---') break;
    if (line.startsWith('name:')) {
      name = line.replace(/^name:\s*/,'').trim();
    } else if (line.startsWith('description:')) {
      description = line.replace(/^description:\s*/,'').trim();
    }
    idx++;
  }
  if (!name || !description) {
    return { ok: false, reason: 'Missing name/description in frontmatter', path: skillMd };
  }
  return { ok: true, path: skillMd, name, description };
}

function scanSkills(rootDir) {
  const results = [];
  if (!fs.existsSync(rootDir)) return results;
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  for (const ent of entries) {
    if (ent.isDirectory()) {
      // ignore hidden/system folders
      if (ent.name.startsWith('.')) continue;
      const sub = path.join(rootDir, ent.name);
      const r = validateSkill(sub);
      results.push({ ...r, skillDir: sub, skillName: ent.name });
    }
  }
  return results;
}

function main() {
  const sources = [
    '/root/.opencode/skills',
    '/root/.claude/skills'
  ];
  const all = [];
  for (const s of sources) {
    all.push(...scanSkills(s));
  }
  const ok = all.filter(r => r.ok);
  const bad = all.filter(r => !r.ok);
  console.log('Skill validation summary:');
  console.log(`  OK: ${ok.length}`);
  console.log(`  BAD: ${bad.length}`);
  if (bad.length > 0) {
    console.log('Problems:');
    bad.forEach(b => {
      console.log(`- ${b.skillName} (${b.skillDir}): ${b.reason}`);
    });
  }
  process.exit(bad.length > 0 ? 2 : 0);
}

if (require.main === module) {
  main();
}
