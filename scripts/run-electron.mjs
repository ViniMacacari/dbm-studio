import { existsSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import electronPath from "electron";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function runNpmScript(script) {
  const result = spawnSync(npmCommand, ["run", script], {
    cwd: projectRoot,
    stdio: "inherit",
    env: process.env
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (!existsSync(new URL("../dist/main/main.js", import.meta.url))) {
  runNpmScript("build:electron");
}

if (!existsSync(new URL("../dist/renderer/browser/index.html", import.meta.url))) {
  runNpmScript("build:renderer");
}

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electronPath, [
  "--disable-gpu",
  "--disable-gpu-compositing",
  "--disable-gpu-sandbox",
  "--disable-dev-shm-usage",
  "--in-process-gpu",
  projectRoot
], {
  stdio: "inherit",
  cwd: projectRoot,
  env
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
