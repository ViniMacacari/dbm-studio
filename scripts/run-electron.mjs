import { existsSync, readdirSync, statSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import electronPath from "electron";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function projectPath(relativePath) {
  return fileURLToPath(new URL(`../${relativePath}`, import.meta.url));
}

function newestModifiedTime(paths) {
  let newest = 0;
  for (const path of paths) {
    newest = Math.max(newest, pathModifiedTime(path));
  }
  return newest;
}

function pathModifiedTime(path) {
  if (!existsSync(path)) {
    return 0;
  }

  const stats = statSync(path);
  if (!stats.isDirectory()) {
    return stats.mtimeMs;
  }

  return readdirSync(path, { withFileTypes: true }).reduce((newest, entry) => {
    return Math.max(newest, pathModifiedTime(`${path}/${entry.name}`));
  }, stats.mtimeMs);
}

function isBuildStale(outputFile, sourcePaths) {
  if (!existsSync(outputFile)) {
    return true;
  }

  return statSync(outputFile).mtimeMs < newestModifiedTime(sourcePaths);
}

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

if (isBuildStale(projectPath("dist/main/main.js"), [
  projectPath("src/app-config.ts"),
  projectPath("src/core"),
  projectPath("src/main"),
  projectPath("src/preload"),
  projectPath("src/shared"),
  projectPath("tsconfig.json"),
  projectPath("tsconfig.electron.json"),
  projectPath("package.json")
])) {
  runNpmScript("build:electron");
}

if (isBuildStale(projectPath("dist/renderer/browser/index.html"), [
  projectPath("src/renderer"),
  projectPath("src/shared"),
  projectPath("angular.json"),
  projectPath("tsconfig.json"),
  projectPath("tsconfig.renderer.json"),
  projectPath("package.json")
])) {
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
