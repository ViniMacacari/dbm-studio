import { parentPort, workerData } from "node:worker_threads";
import { openDatabaseProject } from "../core/projectIO";

try {
  const { xmlPath, dbPath } = workerData as { xmlPath: string; dbPath: string };
  const project = openDatabaseProject(xmlPath, dbPath);
  parentPort?.postMessage({ project });
} catch (error) {
  parentPort?.postMessage({
    error: error instanceof Error ? error.message : String(error)
  });
}
