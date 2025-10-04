#!/usr/bin/env node

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const checkOnly = args.includes("--check-only");

const pathsToCheck = [path.join(rootDir, "node_modules"), path.join(rootDir, "frontend", "node_modules"), path.join(rootDir, "backend", ".venv")];
const markerFile = path.join(rootDir, ".nx", "bootstrap-complete");

function hasAllDependencies() {
  const directoriesExist = pathsToCheck.every((dir) => fs.existsSync(dir));
  if (!directoriesExist) {
    return false;
  }
  return fs.existsSync(markerFile);
}

function runCommand(cmd, args) {
  const result = spawnSync(cmd, args, {
    cwd: rootDir,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function ensureBootstrap() {
  if (hasAllDependencies()) {
    return;
  }

  console.log("🔧 Setting up workspace dependencies (first run detected)...");
  runCommand("npm", ["run", "install:all"]);

  fs.mkdirSync(path.dirname(markerFile), { recursive: true });
  fs.writeFileSync(markerFile, new Date().toISOString());
}

function startDevServers() {
  runCommand("npx", ["nx", "run-many", "-t", "dev", "--output-style=stream", "--color"]);
}

ensureBootstrap();
if (checkOnly) {
  process.exit(0);
}

startDevServers();
