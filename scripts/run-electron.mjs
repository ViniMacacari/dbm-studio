import { spawn } from "node:child_process";
import electronPath from "electron";

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electronPath, [
  "--disable-gpu",
  "--disable-gpu-compositing",
  "--disable-gpu-sandbox",
  "--disable-dev-shm-usage",
  "--in-process-gpu",
  "."
], {
  stdio: "inherit",
  env
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
