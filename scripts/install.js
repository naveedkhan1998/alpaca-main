#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const isWindows = process.platform === 'win32';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function printError(title, message) {
  const width = 60;
  const border = '='.repeat(width);
  console.error(`\n${colors.red}${border}`);
  console.error(`${title}`);
  console.error(`${message}`);
  console.error(`${border}${colors.reset}\n`);
}

// Skip installation steps in CI environment
if (process.env.CI === 'true') {
  console.log(`${colors.green}✅ Running in CI environment - skipping local installation steps${colors.reset}`);
  process.exit(0);
}

function runCommand(command, args, cwd, name) {
  return new Promise((resolve, reject) => {
    console.log(`${colors.yellow}📦 Installing ${name}...${colors.reset}`);
    let spawnCommand, spawnArgs;
    if (isWindows) {
      spawnCommand = 'cmd';
      spawnArgs = ['/c', command, ...args];
    } else {
      spawnCommand = command;
      spawnArgs = args;
    }
    const child = spawn(spawnCommand, spawnArgs, { cwd, stdio: 'inherit' });
    child.on('close', (code) => {
      if (code === 0) {
        console.log(`${colors.green}✅ ${name} installed successfully${colors.reset}`);
        resolve();
      } else {
        reject(new Error(`${name} installation failed with exit code ${code}`));
      }
    });
    child.on('error', (error) => {
      reject(new Error(`${name} installation failed: ${error.message}`));
    });
  });
}

console.log(`${colors.blue}📦 Starting parallel dependency installation...${colors.reset}\n`);

const frontendPromise = runCommand('npm', ['install'], path.join(rootDir, 'frontend'), 'frontend dependencies');
const backendPromise = runCommand('uv', ['sync'], path.join(rootDir, 'backend'), 'backend dependencies');

Promise.all([frontendPromise, backendPromise])
  .then(() => {
    console.log(`\n${colors.yellow}📦 Creating setup completion marker...${colors.reset}`);
    process.chdir(rootDir);
    fs.mkdirSync('.nx', { recursive: true });
    fs.writeFileSync('.nx/bootstrap-complete', new Date().toISOString());
    console.log(`${colors.green}✅ Installation completed successfully!${colors.reset}`);
  })
  .catch((error) => {
    printError('❌ Installation failed', error.message);
    process.exit(1);
  });