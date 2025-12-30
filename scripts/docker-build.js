#!/usr/bin/env node

const { spawn } = require("child_process");
const path = require("path");

const ui = require("./cli-ui");

const rootDir = path.resolve(__dirname, "..");

ui.header("Alpaca Main", "Docker build");
ui.section("Building backend image");

// Skip in CI environment
if (process.env.CI) {
  ui.success("CI detected — skipping Docker build");
  process.exit(0);
}

function runDockerComposeBuild() {
  return new Promise((resolve, reject) => {
    const startedAt = ui.stepStart("Running docker compose build", "docker compose build");

    // Hide noisy Docker output during Nx runs; keep a small tail for errors.
    const tailLimit = 40;
    const tail = [];
    const pushTail = (chunk) => {
      const text = String(chunk);
      for (const line of text.split(/\r?\n/)) {
        if (!line.trim()) continue;
        tail.push(line);
        if (tail.length > tailLimit) tail.shift();
      }
    };

    const child = spawn("docker", ["compose", "build"], {
      cwd: rootDir,
      stdio: ["ignore", "pipe", "pipe"],
    });

    child.stdout?.on("data", pushTail);
    child.stderr?.on("data", pushTail);

    child.on("close", (code) => {
      if (code === 0) {
        ui.stepEnd("Docker build", startedAt);
        resolve();
      } else {
        const details = tail.length ? tail : ["(no output captured)"];
        const error = new Error(`docker compose build failed (exit code ${code})`);
        error.details = details;
        reject(error);
      }
    });

    child.on("error", (error) => {
      reject(new Error(`docker compose build failed: ${error.message}`));
    });
  });
}

runDockerComposeBuild().catch((error) => {
  const lines = [error.message];
  if (Array.isArray(error.details) && error.details.length) {
    lines.push("", "Last build output:");
    lines.push(...error.details.map((l) => `  ${l}`));
  }

  ui.errorBox("Docker build failed", lines, ["docker compose build", "docker compose ps", "docker compose logs -f"]);
  process.exit(1);
});
