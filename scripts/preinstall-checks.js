#!/usr/bin/env node

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ui = require('./cli-ui');

const rootDir = path.resolve(__dirname, '..');

ui.header('Alpaca Main', 'Prerequisite checks');

function checkCommand(command, name, args = ['--version']) {
  try {
    const result = spawnSync(command, args, { stdio: 'pipe', encoding: 'utf8' });
    if (result.status !== 0) {
      throw new Error(`${name} not found`);
    }
    const versionLine = (result.stdout || result.stderr || '').trim().split(/\r?\n/)[0];
    ui.success(`${name} detected${versionLine ? ` ${ui.ansi.reset}${ui.ansi.reset}` : ''}`);
    if (versionLine) ui.info(`${name}: ${versionLine}`);
  } catch (error) {
    ui.errorBox(
      `${name} is not installed or not in PATH`,
      [
        `Required command: ${command}`,
        `Tried: ${command} ${(args || []).join(' ')}`
      ],
      ['npm run install']
    );
    process.exit(1);
  }
}

function checkNodeVersion() {
  const version = process.version;
  const major = parseInt(version.split('.')[0].slice(1));
  if (major < 18) {
    ui.errorBox(
      `Node.js version ${version} is too old`,
      ['Required: Node.js >= 18'],
      ['node --version', 'npm run install']
    );
    process.exit(1);
  }
  ui.success(`Node.js ${version} detected`);
}

function checkDocker() {
  checkCommand('docker', 'Docker');
  try {
    const result = spawnSync('docker', ['info'], { stdio: 'pipe', encoding: 'utf8' });
    if (result.status !== 0) {
      throw new Error('Docker daemon not running');
    }
    ui.success('Docker daemon is running');
  } catch (error) {
    ui.errorBox(
      'Docker daemon is not running',
      ['Start Docker Desktop (or your Docker daemon) and try again.'],
      ['docker info', 'npm run docker:up']
    );
    process.exit(1);
  }
}

function checkEnvVars() {
  const envPath = path.join(rootDir, '.envs', '.env');
  if (!fs.existsSync(envPath)) {
    ui.errorBox(
      '.env file not found',
      ['Expected file: .envs/.env', 'Create it with your Alpaca API configuration.'],
      ['npm run install']
    );
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');

  const apiKeyMatch = envContent.match(/^APCA_API_KEY=(.*)$/m);
  if (!apiKeyMatch || !apiKeyMatch[1].trim() || apiKeyMatch[1].trim() === 'YOUR_ALPACA_KEY') {
    ui.errorBox(
      'APCA_API_KEY not configured',
      ['Set APCA_API_KEY in .envs/.env (not a placeholder).'],
      ['npm run install']
    );
    process.exit(1);
  }

  const secretKeyMatch = envContent.match(/^APCA_API_SECRET_KEY=(.*)$/m);
  if (!secretKeyMatch || !secretKeyMatch[1].trim() || secretKeyMatch[1].trim() === 'YOUR_ALPACA_SECRET_KEY') {
    ui.errorBox(
      'APCA_API_SECRET_KEY not configured',
      ['Set APCA_API_SECRET_KEY in .envs/.env (not a placeholder).'],
      ['npm run install']
    );
    process.exit(1);
  }

  ui.success('Environment variables are configured');
}

ui.section('Checking prerequisites');

// Skip checks in CI environment
if (process.env.CI) {
  ui.success('CI detected — skipping prerequisite checks');
  process.exit(0);
}

const startedAt = ui.stepStart('Running checks');

checkNodeVersion();
checkDocker();
checkCommand('uv', 'uv');
checkEnvVars();

ui.stepEnd('Prerequisites', startedAt);
ui.success('All prerequisites met. Proceeding with installation.');