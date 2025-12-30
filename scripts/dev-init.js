#!/usr/bin/env node

const { spawnSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const markerFile = path.join(rootDir, '.nx', 'bootstrap-complete');

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

const pathsToCheck = [
  path.join(rootDir, 'node_modules'),
  path.join(rootDir, 'frontend', 'node_modules'),
  path.join(rootDir, 'backend', '.venv')
];

function checkDockerRunning() {
  try {
    const result = spawnSync('docker', ['info'], { stdio: 'pipe' });
    return result.status === 0;
  } catch {
    return false;
  }
}

function hasAllDependencies() {
  const directoriesExist = pathsToCheck.every((dir) => fs.existsSync(dir));
  const markerExists = fs.existsSync(markerFile);
  const dockerRunning = checkDockerRunning();
  return directoriesExist && markerExists && dockerRunning;
}

// Skip checks in CI environment
if (process.env.CI) {
  console.log(`${colors.green}✅ Running in CI environment - skipping dependency checks${colors.reset}`);
} else {
  console.log(`${colors.blue}🔍 Checking development environment...${colors.reset}`);

  if (!hasAllDependencies()) {
    const missingDeps = [];
    pathsToCheck.forEach((dir) => {
      if (!fs.existsSync(dir)) {
        missingDeps.push(path.relative(rootDir, dir));
      }
    });
    if (!fs.existsSync(markerFile)) {
      missingDeps.push('bootstrap marker (.nx/bootstrap-complete)');
    }
    if (!checkDockerRunning()) {
      missingDeps.push('Docker daemon running');
    }
    const missingList = missingDeps.map(dep => `  - ${dep}`).join('\n');
    printError('❌ Dependencies not ready', `Missing:\n${missingList}\n\nPlease run \`npm install\` first and ensure Docker is running.`);
    process.exit(1);
  }

  console.log(`${colors.green}✅ All dependencies are installed and Docker is running.${colors.reset}`);
}

console.log(`${colors.yellow}🐳 Starting Docker services...${colors.reset}`);

const result = spawnSync('docker', ['compose', 'up', '-d', '--wait'], { stdio: 'inherit', cwd: rootDir });

if (result.status !== 0) {
  console.error(`${colors.red}❌ Failed to start Docker services${colors.reset}`);
  process.exit(1);
}

console.log(`${colors.green}✅ Docker services started successfully.${colors.reset}`);