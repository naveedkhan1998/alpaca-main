#!/usr/bin/env node

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

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

function checkCommand(command, name, args = ['--version']) {
  try {
    const result = spawnSync(command, args, { stdio: 'pipe' });
    if (result.status !== 0) {
      throw new Error(`${name} not found`);
    }
    console.log(`${colors.green}✅ ${name} is installed${colors.reset}`);
  } catch (error) {
    printError(`❌ ${name} is not installed or not in PATH`, `Please install ${name} and try again.`);
    process.exit(1);
  }
}

function checkNodeVersion() {
  const version = process.version;
  const major = parseInt(version.split('.')[0].slice(1));
  if (major < 18) {
    printError(`❌ Node.js version ${version} is too old`, `Please upgrade to Node.js >= 18`);
    process.exit(1);
  }
  console.log(`${colors.green}✅ Node.js ${version} is installed${colors.reset}`);
}

function checkDocker() {
  checkCommand('docker', 'Docker');
  try {
    const result = spawnSync('docker', ['info'], { stdio: 'pipe' });
    if (result.status !== 0) {
      throw new Error('Docker daemon not running');
    }
    console.log(`${colors.green}✅ Docker daemon is running${colors.reset}`);
  } catch (error) {
    printError('❌ Docker daemon is not running', 'Please start Docker and try again.');
    process.exit(1);
  }
}

function checkEnvVars() {
  const envPath = path.join(rootDir, '.envs', '.env');
  if (!fs.existsSync(envPath)) {
    printError('❌ .env file not found at .envs/.env', 'Please create this file with your Alpaca API configuration.');
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');

  const apiKeyMatch = envContent.match(/^APCA_API_KEY=(.*)$/m);
  if (!apiKeyMatch || !apiKeyMatch[1].trim() || apiKeyMatch[1].trim() === 'YOUR_ALPACA_KEY') {
    printError('❌ APCA_API_KEY not properly configured in .envs/.env', 'Please set a valid Alpaca API key.');
    process.exit(1);
  }

  const secretKeyMatch = envContent.match(/^APCA_API_SECRET_KEY=(.*)$/m);
  if (!secretKeyMatch || !secretKeyMatch[1].trim() || secretKeyMatch[1].trim() === 'YOUR_ALPACA_SECRET_KEY') {
    printError('❌ APCA_API_SECRET_KEY not properly configured in .envs/.env', 'Please set a valid Alpaca API secret key.');
    process.exit(1);
  }

  console.log(`${colors.green}✅ Environment variables are configured${colors.reset}`);
}

console.log(`\n${colors.blue}🔍 Checking prerequisites...${colors.reset}\n`);

// Skip checks in CI environment
if (process.env.CI) {
  console.log(`${colors.green}✅ Running in CI environment - skipping prerequisite checks${colors.reset}`);
  console.log(`\n${colors.green}✅ Prerequisites check skipped for CI...${colors.reset}\n`);
  process.exit(0);
}

checkNodeVersion();
checkDocker();
checkCommand('uv', 'uv');

checkEnvVars();

console.log(`\n${colors.green}✅ All prerequisites met. Proceeding with installation...${colors.reset}\n`);