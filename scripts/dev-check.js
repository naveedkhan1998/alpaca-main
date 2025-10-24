#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const markerFile = path.join(rootDir, '.nx', 'bootstrap-complete');

const pathsToCheck = [
  path.join(rootDir, 'node_modules'),
  path.join(rootDir, 'frontend', 'node_modules'),
  path.join(rootDir, 'backend', '.venv')
];

function hasAllDependencies() {
  const directoriesExist = pathsToCheck.every((dir) => fs.existsSync(dir));
  return directoriesExist && fs.existsSync(markerFile);
}

// Skip checks in CI environment
if (process.env.CI) {
  console.log('✅ Running in CI environment - skipping dependency checks');
  process.exit(0);
}

if (!hasAllDependencies()) {
  console.error('❌ Dependencies not installed. Please run `npm install` first.');
  process.exit(1);
}

console.log('✅ Dependencies are installed. Starting development servers...');