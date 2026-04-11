'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');
const { spawnSync, spawn } = require('child_process');

function rlCreate() {
  return readline.createInterface({ input: process.stdin, output: process.stdout });
}

function ask(rl, question, defaultValue) {
  return new Promise(resolve => {
    const prompt = defaultValue !== undefined ? ` [${defaultValue}]` : '';
    rl.question(`${question}${prompt}: `, (answer) => {
      rl.close();
      resolve(answer.length ? answer : defaultValue);
    });
  });
}

function confirmQuestion(rl, question, defaultYes = true) {
  return new Promise(resolve => {
    const prompt = defaultYes ? '[Y/n]' : '[y/N]';
    rl.question(`${question} ${prompt} `, (ans) => {
      rl.close();
      if (!ans) return resolve(defaultYes);
      const v = ans.toLowerCase();
      resolve(v === 'y' || v === 'yes');
    });
  });
}

function run(cmd, args = []) {
  const result = spawnSync(cmd, args, { stdio: 'inherit', shell: true });
  return result.status === 0;
}

function exists(p) {
  try { return fs.existsSync(p); } catch { return false; }
}

async function main() {
  const nonInteractive = (process.env.NON_INTERACTIVE === '1') || (process.env.CI === 'true');
  console.log('EcoSynTech Bootstrap: auto-install & run tooling');
  // 1) Check Node.js
  let haveNode = false;
  try {
    const v = spawnSync('node', ['-v'], { stdio: 'ignore', shell: true });
    haveNode = v.status === 0;
  } catch { haveNode = false; }
  if (!haveNode) {
    console.log('Node.js is not installed or not in PATH. This bootstrap requires Node.js 18+.');
    const sys = os.platform();
    if (sys === 'linux' || sys === 'darwin') {
      console.log('Suggested: Install via NVM (Node Version Manager)');
      console.log('  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.4/install.sh | bash');
      console.log('  source ~/.bashrc  # or restart terminal');
      console.log('  nvm install 18');
      console.log('  nvm use 18');
    } else if (sys === 'win32') {
      console.log('Windows: Install Node.js 18+ from https://nodejs.org/');
    } else {
      console.log('Please install Node.js 18+ for your OS.');
    }
    process.exit(1);
  }

  // 2) npm availability
  const npmOk = (() => {
    try { spawnSync('npm', ['-v'], { stdio: 'ignore', shell: true }); return true; } catch { return false; }
  })();
  if (!npmOk) {
    console.log('npm is not available. Please install npm with Node.js.');
    process.exit(1);
  }

  // 3) package.json exists
  const pkgPath = path.resolve(process.cwd(), 'package.json');
  if (!fs.existsSync(pkgPath)) {
    console.log('package.json not found in current folder. Ensure you are in repo root.');
    process.exit(1);
  }

  // 4) Install dependencies
  const nodeModules = exists(path.resolve(process.cwd(), 'node_modules'));
  if (nodeModules) {
    const rl = rlCreate();
    const reinstall = await confirmQuestion(rl, 'node_modules detected. Reinstall dependencies?', false);
    if (reinstall) {
      console.log('Running npm ci...');
      if (!spawnSync('npm', ['ci'], { stdio: 'inherit', shell: true }).status === 0) {
        console.error('npm ci failed');
      }
    } else {
      console.log('Skipping dependencies reinstall.');
    }
  } else {
    if (exists(path.resolve(process.cwd(), 'package-lock.json'))) {
      console.log('Installing dependencies via npm ci...');
      if (!spawnSync('npm', ['ci'], { stdio: 'inherit', shell: true }).status === 0) {
        console.error('npm ci failed');
      }
    } else {
      console.log('Installing dependencies via npm install...');
      if (!spawnSync('npm', ['install'], { stdio: 'inherit', shell: true }).status === 0) {
        console.error('npm install failed');
      }
    }
  }

  // 5) Optional actions: lint, test, build
  if (nonInteractive) {
    console.log('Running in non-interactive mode: running lint, test, build by default.');
    run('npm', ['run', 'lint']);
    run('npm', ['test']);
    run('npm', ['run', 'build']);
  } else {
    if (await confirmQuestion(rlCreate(), 'Run lint now?', true)) {
      run('npm', ['run', 'lint']);
    }
    if (await confirmQuestion(rlCreate(), 'Run tests now?', true)) {
      run('npm', ['test']);
    }
    if (await confirmQuestion(rlCreate(), 'Run build now?', true)) {
      run('npm', ['run', 'build']);
    }
  }

  // 6) Env file
  const envPath = path.resolve(process.cwd(), '.env');
  let wantEnv = true;
  if (exists(envPath)) {
    wantEnv = await confirmQuestion(rlCreate(), '.env already exists. Overwrite?', false);
  }
  if (wantEnv) {
    const rand = (n) => require('crypto').randomBytes(n).toString('hex');
    const content = [
      `PORT=${process.env.PORT || 3000}`,
      `NODE_ENV=${process.env.NODE_ENV || 'development'}`,
      `JWT_SECRET=${rand(32)}`,
      `JWT_EXPIRES_IN=${process.env.JWT_EXPIRES_IN || 3600}`,
      `WEBHOOK_SECRET=${rand(32)}`,
      `MQTT_BROKER=${process.env.MQTT_BROKER || ''}`
    ].join('\n');
    fs.writeFileSync(envPath, content);
    console.log('Generated .env with default values.');
  }

  // 7) Start server option
  if (await confirmQuestion(rlCreate(), 'Start server now?', false)) {
    console.log('Starting server...');
    const sp = spawn('npm', ['start'], { stdio: 'inherit', shell: true });
    sp.on('close', (code) => console.log('Server exited with code', code));
  }

  // Optional: auto-create PR after bootstrap in CI/CD style run
  if (process.env.AUTO_PR_MERGE === '1' || process.env.AUTO_PR_MERGE === 'true') {
    console.log('Triggering automatic PR creation and auto-merge...');
    // Propagate defaults to PR script via env, allow override by PR_* vars
    const child = require('child_process').spawn('node', ['scripts/pr-auto-merge.js'], {
      stdio: 'inherit',
      env: Object.assign({}, process.env, {
        PR_HEAD: process.env.PR_HEAD || 'feature/full-test-ci',
        PR_BASE: process.env.PR_BASE || 'main',
        PR_TITLE: process.env.PR_TITLE || 'feat: End-to-End Test Suite + CI/CD',
        PR_BODY: process.env.PR_BODY || 'End-to-end tests, webhook tests, seed data, and CI/CD pipeline implemented.'
      }),
    });
    child.on('error', (err) => console.error('PR automation failed:', err.message));
  }
}

main().catch((err) => {
  console.error('Bootstrap failed:', err);
  process.exit(1);
});
