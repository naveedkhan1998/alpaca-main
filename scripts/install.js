#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ui = require('./cli-ui');

const rootDir = path.resolve(__dirname, '..');
const isWindows = process.platform === 'win32';

ui.header('Alpaca Main', 'Dependency installation');

// Skip installation steps in CI environment
if (process.env.CI) {
  ui.success('CI detected — skipping local installation steps');
  process.exit(0);
}

function runCommand(command, args, cwd, name) {
  return new Promise((resolve, reject) => {
    const startedAt = ui.stepStart(`Installing ${name}`, `${command} ${args.join(' ')}  (${path.relative(rootDir, cwd) || '.'})`);
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
        ui.stepEnd(`${name}`, startedAt);
        resolve();
      } else {
        reject(
          new Error(
            `${name} installation failed (exit code ${code}). Command: ${command} ${args.join(' ')} (cwd: ${cwd})`
          )
        );
      }
    });
    child.on('error', (error) => {
      reject(new Error(`${name} installation failed: ${error.message}. Command: ${command} ${args.join(' ')} (cwd: ${cwd})`));
    });
  });
}

ui.section('Running installs in parallel');
ui.info('This may take a few minutes the first time.');

const overallStartedAt = Date.now();

const frontendPromise = runCommand('npm', ['install'], path.join(rootDir, 'frontend'), 'frontend dependencies');
const backendPromise = runCommand('uv', ['sync'], path.join(rootDir, 'backend'), 'backend dependencies');

Promise.all([frontendPromise, backendPromise])
  .then(() => {
    const markerStartedAt = ui.stepStart('Creating setup completion marker', '.nx/bootstrap-complete');
    process.chdir(rootDir);
    fs.mkdirSync('.nx', { recursive: true });
    fs.writeFileSync('.nx/bootstrap-complete', new Date().toISOString());
    ui.stepEnd('Setup marker', markerStartedAt);
    ui.success(`Installation completed successfully (${ui.formatDuration(Date.now() - overallStartedAt)})`);
    ui.info(`Next: run ${ui.commandHint('npm run dev')}`);
  })
  .catch((error) => {
    ui.errorBox('Installation failed', [error.message], ['npm run install', 'npm run install:frontend', 'npm run install:backend']);
    process.exit(1);
  });