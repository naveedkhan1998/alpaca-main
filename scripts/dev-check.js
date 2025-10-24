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

if (!hasAllDependencies()) {
  console.error('❌ Dependencies not installed. Please run `npm install` first.');
  process.exit(1);
}

console.log('✅ Dependencies are installed. Starting development servers...');