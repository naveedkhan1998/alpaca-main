#!/usr/bin/env node

const { spawnSync, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const ui = require("./cli-ui");

const rootDir = path.resolve(__dirname, "..");
const markerFile = path.join(rootDir, ".nx", "bootstrap-complete");

ui.header("Alpaca Main", "Development environment");

const pathsToCheck = [path.join(rootDir, "node_modules"), path.join(rootDir, "frontend", "node_modules"), path.join(rootDir, "backend", ".venv")];

function checkDockerRunning() {
  try {
    const result = spawnSync("docker", ["info"], { stdio: "pipe" });
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
  ui.success("CI detected — skipping dependency checks");
} else {
  ui.section("Checking development environment");

  if (!hasAllDependencies()) {
    const missingDeps = [];
    pathsToCheck.forEach((dir) => {
      if (!fs.existsSync(dir)) {
        missingDeps.push(path.relative(rootDir, dir));
      }
    });
    if (!fs.existsSync(markerFile)) {
      missingDeps.push("bootstrap marker (.nx/bootstrap-complete)");
    }
    if (!checkDockerRunning()) {
      missingDeps.push("Docker daemon running");
    }
    ui.errorBox("Dependencies not ready", ["Missing:", ...missingDeps.map((dep) => `- ${dep}`)], ["npm run install", "npm run docker:up"]);
    process.exit(1);
  }

  ui.success("All dependencies are installed and Docker is running.");
}

ui.section("Starting Docker services");
ui.info(ui.commandHint("docker compose up -d --wait"));

function runDockerComposeUpShowHealthyOnly() {
  return new Promise((resolve, reject) => {
    const startedAt = ui.stepStart("Bringing containers up");

    const healthySeen = new Set();
    const tailLimit = 60;
    const tail = [];
    const pushTail = (line) => {
      const trimmed = String(line).trimEnd();
      if (!trimmed) return;
      tail.push(trimmed);
      if (tail.length > tailLimit) tail.shift();
    };

    let stdoutBuffer = "";
    let stderrBuffer = "";

    const child = spawn("docker", ["compose", "up", "-d", "--wait"], {
      cwd: rootDir,
      stdio: ["ignore", "pipe", "pipe"],
    });

    const handleLine = (rawLine) => {
      const line = String(rawLine).trim();
      if (!line) return;

      // Examples:
      // "Container alpaca-redis  Healthy"
      // "✔ Container alpaca-redis  Healthy" (sometimes)
      const match = line.match(/(?:^|\s)Container\s+([^\s]+)\s+Healthy\b/);
      if (!match) return;

      const containerName = match[1];
      if (healthySeen.has(containerName)) return;
      healthySeen.add(containerName);

      console.log(`Container ${containerName}  Healthy`);
    };

    child.stdout.on("data", (chunk) => {
      stdoutBuffer += chunk.toString("utf8");
      const lines = stdoutBuffer.split(/\r?\n/);
      stdoutBuffer = lines.pop() ?? "";
      for (const line of lines) {
        pushTail(line);
        handleLine(line);
      }
    });

    child.stderr.on("data", (chunk) => {
      stderrBuffer += chunk.toString("utf8");
      const lines = stderrBuffer.split(/\r?\n/);
      stderrBuffer = lines.pop() ?? "";
      for (const line of lines) {
        pushTail(line);
        handleLine(line);
      }
    });

    child.on("error", (error) => {
      reject(new Error(`Failed to start Docker services: ${error.message}`));
    });

    child.on("close", (code) => {
      if (stdoutBuffer) pushTail(stdoutBuffer);
      if (stderrBuffer) pushTail(stderrBuffer);

      if (code === 0) {
        ui.stepEnd("Docker services", startedAt);
        resolve();
        return;
      }

      const lines = tail.length ? tail.slice(-20) : ["(no output captured)"];
      const err = new Error(`Docker compose exited with code ${code}`);
      err.details = lines;
      reject(err);
    });
  });
}

runDockerComposeUpShowHealthyOnly()
  .then(() => {
    ui.success("Docker services started successfully.");
    ui.section("Following backend logs");
    ui.info(ui.commandHint("docker compose logs backend -f"));
    const logsProcess = spawn("docker", ["compose", "logs", "backend", "-f"], {
      cwd: rootDir,
      stdio: "inherit",
    });
    logsProcess.on("error", (error) => {
      ui.error(`Failed to start logs: ${error.message}`);
    });
  })
  .catch((error) => {
    const body = ["Docker compose failed to bring services up."];
    if (error?.message) body.push(error.message);
    if (Array.isArray(error?.details) && error.details.length) {
      body.push("", "Last output:");
      body.push(...error.details.map((l) => `  ${l}`));
    }
    ui.errorBox("Failed to start Docker services", body, ["docker compose up -d --wait", "docker compose ps", "docker compose logs -f", "npm run docker:up"]);
    process.exit(1);
  });
