#!/usr/bin/env node

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

function checkCommand(command, name) {
  try {
    const result = spawnSync(command, ['--version'], { stdio: 'pipe' });
    if (result.status !== 0) {
      throw new Error(`${name} not found`);
    }
    console.log(`✅ ${name} is installed`);
  } catch (error) {
    console.error(`❌ ${name} is not installed or not in PATH`);
    console.error(`   Please install ${name} and try again.`);
    process.exit(1);
  }
}

function checkEnvVars() {
  const envPath = path.join(rootDir, '.envs', '.env');
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env file not found at .envs/.env');
    console.error('   Please create this file with your Alpaca API configuration.');
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');

  const apiKeyMatch = envContent.match(/^APCA_API_KEY=(.*)$/m);
  if (!apiKeyMatch || !apiKeyMatch[1].trim() || apiKeyMatch[1].trim() === 'YOUR_ALPACA_KEY') {
    console.error('❌ APCA_API_KEY not properly configured in .envs/.env');
    console.error('   Please set a valid Alpaca API key.');
    process.exit(1);
  }

  const secretKeyMatch = envContent.match(/^APCA_API_SECRET_KEY=(.*)$/m);
  if (!secretKeyMatch || !secretKeyMatch[1].trim() || secretKeyMatch[1].trim() === 'YOUR_ALPACA_SECRET_KEY') {
    console.error('❌ APCA_API_SECRET_KEY not properly configured in .envs/.env');
    console.error('   Please set a valid Alpaca API secret key.');
    process.exit(1);
  }

  console.log('✅ Environment variables are configured');
}

console.log('\n🔍 Checking prerequisites...\n');

checkCommand('node', 'Node.js');
checkCommand('docker', 'Docker');
checkCommand('uv', 'uv');

checkEnvVars();

console.log('\n✅ All prerequisites met. Proceeding with installation...\n');