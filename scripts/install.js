#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

// Skip installation steps in CI environment
if (process.env.CI === 'true') {
  console.log('✅ Running in CI environment - skipping local installation steps');
  process.exit(0);
}

console.log('📦 Installing frontend dependencies...');
process.chdir(path.join(rootDir, 'frontend'));
execSync('npm install', { stdio: 'inherit' });

console.log('📦 Installing backend dependencies...');
process.chdir(path.join(rootDir, 'backend'));
execSync('uv sync', { stdio: 'inherit' });

console.log('📦 Creating setup completion marker...');
process.chdir(rootDir);
fs.mkdirSync('.nx', { recursive: true });
fs.writeFileSync('.nx/bootstrap-complete', new Date().toISOString());

console.log('✅ Installation completed successfully!');