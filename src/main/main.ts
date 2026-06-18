import { app, BrowserWindow, dialog, ipcMain, screen, Menu } from "electron";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { Worker } from "node:worker_threads";
import { computeLanguageHash, toSignedInt32 } from "../core/fifaHash";
import { openCompdataProject, saveCompdataProject } from "../core/compdataIO";
import { extractBig, readBigEntries } from "../core/bigArchive";
import { VisualDependencyManager } from "./visualDependencyManager";
import {
  exportTable,
  importTable,
  openTextFolderProject,
  openXmlProject,
  saveDatabaseProject
} from "../core/projectIO";
import type { CompdataOpenProgress, CompdataProject, DataTable, DbProject, LocalizationProject } from "../shared/types";

let mainWindow: BrowserWindow | undefined;
let visualDependencyManager: VisualDependencyManager | undefined;
let lastBlurDisplayState: WindowDisplayState | undefined;
const windowDisplayRestoreDelays = [0, 75, 250, 750, 1500];
const workAreaTolerancePx = 64;
const compdataReferenceTimeoutMs = 30000;

function debugCompdataMain(stage: string, detail?: unknown): void {
  const timestamp = new Date().toISOString();
  if (detail === undefined) {
    console.log(`[compdata/main ${timestamp}] ${stage}`);
    return;
  }
  console.log(`[compdata/main ${timestamp}] ${stage}`, detail);
}

app.disableHardwareAcceleration();
app.commandLine.appendSwitch("disable-gpu");
app.commandLine.appendSwitch("disable-gpu-compositing");
app.commandLine.appendSwitch("disable-gpu-sandbox");
app.commandLine.appendSwitch("disable-dev-shm-usage");
app.commandLine.appendSwitch("in-process-gpu");

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 980,
    minHeight: 620,
    title: "DBM Studio",
    icon: join(process.cwd(), "app.ico"),
    webPreferences: {
      preload: join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const angularIndex = join(__dirname, "../renderer/browser/index.html");
  const legacyIndex = join(__dirname, "../renderer/index.html");
  void mainWindow.loadFile(existsSync(angularIndex) ? angularIndex : legacyIndex);

  trackWindowDisplayState(mainWindow);
}

function activeWindow(): BrowserWindow | undefined {
  return mainWindow;
}

function visualDependencies(): VisualDependencyManager {
  visualDependencyManager ??= new VisualDependencyManager(app.getPath("userData"));
  return visualDependencyManager;
}

interface WindowDisplayState {
  window?: BrowserWindow;
  wasFullScreen: boolean;
  wasMaximized: boolean;
  wasWorkAreaSized: boolean;
  bounds?: Electron.Rectangle;
  workArea?: Electron.Rectangle;
}

interface DatabaseFilePair {
  baseName: string;
  xmlPath: string;
  dbPath: string;
}

interface FolderPickResult {
  canceled?: boolean;
  folderPath?: string;
}

function captureWindowDisplayState(): WindowDisplayState {
  const window = activeWindow();
  const bounds = window?.getBounds();
  const workArea = bounds ? screen.getDisplayMatching(bounds).workArea : undefined;
  return {
    window,
    wasFullScreen: window?.isFullScreen() ?? false,
    wasMaximized: window?.isMaximized() ?? false,
    wasWorkAreaSized: bounds && workArea ? isWorkAreaSized(bounds, workArea) : false,
    bounds,
    workArea
  };
}

function shouldRestoreWindowDisplayState(state: WindowDisplayState): boolean {
  return state.wasFullScreen || state.wasMaximized || state.wasWorkAreaSized;
}

function isWorkAreaSized(bounds: Electron.Rectangle, workArea: Electron.Rectangle): boolean {
  return bounds.width >= workArea.width - workAreaTolerancePx && bounds.height >= workArea.height - workAreaTolerancePx;
}

function applyWindowDisplayState(state: WindowDisplayState): void {
  const window = state.window;
  if (!window || window.isDestroyed() || window.isMinimized()) {
    return;
  }

  if (state.wasFullScreen && !window.isFullScreen()) {
    window.setFullScreen(true);
    return;
  }
  if (state.wasMaximized && !window.isMaximized()) {
    window.maximize();
    return;
  }
  if (state.wasWorkAreaSized) {
    const restoreBounds = state.workArea ?? state.bounds;
    if (restoreBounds) {
      window.setBounds(restoreBounds);
    }
  }
}

function queueWindowDisplayStateRestore(state: WindowDisplayState): void {
  if (!shouldRestoreWindowDisplayState(state)) {
    return;
  }
  for (const delay of windowDisplayRestoreDelays) {
    setTimeout(() => applyWindowDisplayState(state), delay);
  }
}

async function restoreWindowDisplayState(state: WindowDisplayState): Promise<void> {
  queueWindowDisplayStateRestore(state);
  if (!shouldRestoreWindowDisplayState(state)) {
    return;
  }
  await new Promise<void>((resolve) => setTimeout(resolve, 90));
  applyWindowDisplayState(state);
}

async function keepWindowDisplayState<T>(action: () => T | Promise<T>): Promise<T> {
  const state = captureWindowDisplayState();
  try {
    return await action();
  } finally {
    await restoreWindowDisplayState(state);
  }
}

function trackWindowDisplayState(window: BrowserWindow): void {
  window.on("blur", () => {
    const state = captureWindowDisplayState();
    lastBlurDisplayState = shouldRestoreWindowDisplayState(state) ? state : undefined;
  });

  window.on("focus", () => {
    if (lastBlurDisplayState && !window.isMinimized()) {
      queueWindowDisplayStateRestore(lastBlurDisplayState);
    }
  });

  window.on("closed", () => {
    if (mainWindow === window) {
      mainWindow = undefined;
      lastBlurDisplayState = undefined;
    }
  });
}

function shouldParentNativeDialog(): boolean {
  return process.platform !== "linux";
}

async function pickFile(title: string, filters: Electron.FileFilter[]): Promise<string | undefined> {
  const options: Electron.OpenDialogOptions = {
    title,
    properties: ["openFile"],
    filters
  };
  const window = activeWindow();
  const result = await keepWindowDisplayState(() =>
    window && shouldParentNativeDialog() ? dialog.showOpenDialog(window, options) : dialog.showOpenDialog(options)
  );
  return result.canceled ? undefined : result.filePaths[0];
}

async function pickFolder(title: string): Promise<string | undefined> {
  const options: Electron.OpenDialogOptions = {
    title,
    properties: ["openDirectory", "createDirectory"]
  };
  const window = activeWindow();
  const result = await keepWindowDisplayState(() =>
    window && shouldParentNativeDialog() ? dialog.showOpenDialog(window, options) : dialog.showOpenDialog(options)
  );
  return result.canceled ? undefined : result.filePaths[0];
}

async function pickSaveFile(title: string, defaultPath: string, filters: Electron.FileFilter[]): Promise<string | undefined> {
  const options: Electron.SaveDialogOptions = {
    title,
    defaultPath,
    filters
  };
  const window = activeWindow();
  const result = await keepWindowDisplayState(() =>
    window && shouldParentNativeDialog() ? dialog.showSaveDialog(window, options) : dialog.showSaveDialog(options)
  );
  return result.canceled ? undefined : result.filePath;
}

function openDatabaseInWorker(xmlPath: string, dbPath: string, timeoutMs?: number): Promise<DbProject> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(join(__dirname, "openDatabaseWorker.js"), {
      workerData: { xmlPath, dbPath }
    });
    let settled = false;
    const timeout = timeoutMs
      ? setTimeout(() => {
        if (settled) {
          return;
        }
        settled = true;
        void worker.terminate();
        reject(new Error(`Database reference timed out after ${Math.round(timeoutMs / 1000)} seconds.`));
      }, timeoutMs)
      : undefined;

    const finish = (callback: () => void): void => {
      if (settled) {
        return;
      }
      settled = true;
      if (timeout) {
        clearTimeout(timeout);
      }
      callback();
    };

    worker.once("message", (message: { project?: DbProject; error?: string }) => {
      finish(() => {
        if (message.error) {
          reject(new Error(message.error));
          return;
        }
        if (!message.project) {
          reject(new Error("Database worker finished without returning a project."));
          return;
        }
        resolve(message.project);
      });
    });

    worker.once("error", (error) => {
      finish(() => reject(error));
    });
    worker.once("exit", (code) => {
      if (code !== 0 && !settled) {
        finish(() => reject(new Error(`Database worker exited with code ${code}.`)));
      }
    });
  });
}

function toLocalizationProject(project: DbProject): LocalizationProject {
  if (project.sourceKind !== "database" || !project.xmlPath || !project.dbPath) {
    throw new Error("Localization files must be opened as a DB/XML pair.");
  }
  return {
    title: project.title,
    sourceKind: "database",
    xmlPath: project.xmlPath,
    dbPath: project.dbPath,
    tables: project.tables,
    descriptors: project.descriptors,
    warnings: project.warnings,
    binaryReadMode: project.binaryReadMode,
    databaseWritable: project.databaseWritable
  };
}

function attachLocalizationProject(project: DbProject, localization: DbProject): DbProject {
  project.localization = toLocalizationProject(localization);
  project.warnings = [
    ...project.warnings,
    ...localization.warnings.map((warning) => `Localization: ${warning}`)
  ];
  return project;
}

function databasePairBaseName(fileName: string): string {
  return basename(fileName, extname(fileName)).replace(/-meta$/i, "");
}

function findDatabasePayloadName(baseName: string, filesByName: Map<string, string>): string | undefined {
  const normalizedBase = baseName.toLowerCase();
  return filesByName.get(`${normalizedBase}.db`)
    ?? filesByName.get(`${normalizedBase}.loc`)
    ?? [...filesByName.values()].find((fileName) => {
      const normalizedName = fileName.toLowerCase();
      return new RegExp(`^${escapeRegExp(normalizedBase)}\\d+\\.(db|loc)$`, "i").test(normalizedName);
    });
}

function findDatabaseFilePairs(folderPath: string): DatabaseFilePair[] {
  const entries = readdirSync(folderPath, { withFileTypes: true }).filter((entry) => entry.isFile());
  const filesByName = new Map(entries.map((entry) => [entry.name.toLowerCase(), entry.name]));
  const pairs: DatabaseFilePair[] = [];

  for (const entry of entries) {
    if (extname(entry.name).toLowerCase() !== ".xml") {
      continue;
    }
    const baseName = databasePairBaseName(entry.name);
    const dbName = findDatabasePayloadName(baseName, filesByName);
    if (!dbName) {
      continue;
    }
    pairs.push({
      baseName,
      xmlPath: join(folderPath, entry.name),
      dbPath: join(folderPath, dbName)
    });
  }

  return pairs;
}

function referencePairDiagnostics(folderPath: string, pairs: DatabaseFilePair[]): string[] {
  if (pairs.length > 0) {
    return [];
  }

  const entries = readdirSync(folderPath, { withFileTypes: true }).filter((entry) => entry.isFile());
  const xmlCandidates = entries
    .filter((entry) => extname(entry.name).toLowerCase() === ".xml")
    .map((entry) => databasePairBaseName(entry.name))
    .filter((baseName) => isLocalizationBaseName(baseName));
  const payloadCandidates = entries
    .filter((entry) => [".db", ".loc"].includes(extname(entry.name).toLowerCase()))
    .map((entry) => basename(entry.name, extname(entry.name)))
    .filter((baseName) => isLocalizationBaseName(baseName));

  if (xmlCandidates.length > 0 && payloadCandidates.length === 0) {
    return [`Found localization XML file(s) but no matching .db/.loc file: ${xmlCandidates.join(", ")}`];
  }
  if (payloadCandidates.length > 0 && xmlCandidates.length === 0) {
    return [`Found localization .db/.loc file(s) but no matching XML descriptor: ${payloadCandidates.join(", ")}`];
  }
  if (xmlCandidates.length > 0 || payloadCandidates.length > 0) {
    return ["No valid localization XML + .db/.loc pair could be built from the selected folder."];
  }
  return [];
}

function findMainDatabasePair(pairs: DatabaseFilePair[]): DatabaseFilePair | undefined {
  return pairs.find((pair) => pair.baseName.toLowerCase() === "fifa_ng_db")
    ?? pairs.find((pair) => /(^|[_-])db($|[_-])/i.test(pair.baseName) && !isLocalizationBaseName(pair.baseName))
    ?? (pairs.length === 1 && !isLocalizationBaseName(pairs[0].baseName) ? pairs[0] : undefined);
}

function findLocalizationDatabasePair(pairs: DatabaseFilePair[], mainPair?: DatabaseFilePair): DatabaseFilePair | undefined {
  const candidates = mainPair ? pairs.filter((pair) => pair !== mainPair) : pairs;
  return candidates.find((pair) => isLocalizationBaseName(pair.baseName))
    ?? candidates[0];
}

function isLocalizationBaseName(baseName: string): boolean {
  return /^(loc|locale|language|[a-z]{2}[_-][a-z]{2})/i.test(baseName);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function makeLocalizationOnlyReference(project: DbProject): DbProject {
  return {
    ...project,
    localization: toLocalizationProject(project)
  };
}

function trimCompdataReferenceProject(project: DbProject): DbProject {
  const referenceTables = new Set(["teams", "leagues", "leagueteamlinks", "nations"]);
  const tables = project.tables.filter((table) => referenceTables.has(table.name.toLowerCase()));
  const descriptors = project.descriptors.filter((descriptor) => referenceTables.has(descriptor.name.toLowerCase()));
  return {
    ...project,
    tables,
    descriptors
  };
}

function openCompdataWorkspace(folderPath: string, onProgress?: (progress: CompdataOpenProgress) => void): { projectJson: string } {
  debugCompdataMain("openCompdataWorkspace:start", { folderPath });
  const project = openCompdataProject(folderPath, onProgress);
  debugCompdataMain("openCompdataWorkspace:parsed", {
    title: project.title,
    competitions: project.competitions.length,
    objects: project.objects.length,
    warnings: project.warnings.length
  });
  const projectJson = JSON.stringify(project);
  debugCompdataMain("openCompdataWorkspace:stringified", {
    bytes: Buffer.byteLength(projectJson)
  });
  return { projectJson };
}

async function openCompdataReferenceProject(folderPath: string): Promise<{ referenceProject?: DbProject; warnings: string[] }> {
  const warnings: string[] = [];
  const pairs = findDatabaseFilePairs(folderPath);
  warnings.push(...referencePairDiagnostics(folderPath, pairs));

  const locPair = findLocalizationDatabasePair(pairs);
  if (!locPair) {
    return { warnings };
  }

  try {
    const localization = await openDatabaseInWorker(locPair.xmlPath, locPair.dbPath, compdataReferenceTimeoutMs);
    return { referenceProject: makeLocalizationOnlyReference(localization), warnings };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    warnings.push(`LOC reference ${locPair.baseName}: ${message}`);
    return { warnings };
  }
}

async function pickCompdataFolder(): Promise<FolderPickResult> {
  return keepWindowDisplayState(async () => {
    const folderPath = await pickFolder("Open Compdata Folder");
    return folderPath ? { folderPath } : { canceled: true };
  });
}

ipcMain.handle("project:openXml", async () => {
  return keepWindowDisplayState(async () => {
    const xmlPath = await pickFile("Open XML Descriptor File", [{ name: "XML files", extensions: ["xml"] }]);
    if (!xmlPath) {
      return { canceled: true };
    }
    return { project: openXmlProject(xmlPath) };
  });
});

ipcMain.handle("project:openDatabase", async () => {
  return keepWindowDisplayState(async () => {
    const xmlPath = await pickFile("Open XML Descriptor File", [{ name: "XML files", extensions: ["xml"] }]);
    if (!xmlPath) {
      return { canceled: true };
    }
    const dbPath = await pickFile("Open Database File", [{ name: "DB files", extensions: ["db"] }]);
    if (!dbPath) {
      return { canceled: true };
    }
    return { project: await openDatabaseInWorker(xmlPath, dbPath) };
  });
});

ipcMain.handle("project:openDatabaseWithLocalization", async () => {
  return keepWindowDisplayState(async () => {
    const xmlPath = await pickFile("Open Main XML Descriptor File", [{ name: "XML files", extensions: ["xml"] }]);
    if (!xmlPath) {
      return { canceled: true };
    }
    const dbPath = await pickFile("Open Main Database File", [{ name: "DB files", extensions: ["db"] }]);
    if (!dbPath) {
      return { canceled: true };
    }
    const locXmlPath = await pickFile("Open Loc XML Descriptor File", [{ name: "XML files", extensions: ["xml"] }]);
    if (!locXmlPath) {
      return { canceled: true };
    }
    const locDbPath = await pickFile("Open LOC Database File", [{ name: "LOC/DB files", extensions: ["db", "loc"] }]);
    if (!locDbPath) {
      return { canceled: true };
    }

    const project = await openDatabaseInWorker(xmlPath, dbPath);
    const localization = await openDatabaseInWorker(locXmlPath, locDbPath);
    return { project: attachLocalizationProject(project, localization) };
  });
});

ipcMain.handle("project:openTextFolder", async () => {
  return keepWindowDisplayState(async () => {
    const folderPath = await pickFolder("Open Exported Tables Folder");
    if (!folderPath) {
      return { canceled: true };
    }
    return { project: openTextFolderProject(folderPath) };
  });
});

ipcMain.handle("compdata:pickFolder", async () => {
  debugCompdataMain("ipc:pickFolder:start");
  const result = await pickCompdataFolder();
  debugCompdataMain("ipc:pickFolder:done", result);
  return result;
});

ipcMain.handle("compdata:openFolder", async (event, folderPath?: string) => {
  debugCompdataMain("ipc:openFolder:start", { folderPath });
  return keepWindowDisplayState(async () => {
    const selectedFolderPath = folderPath ?? (await pickCompdataFolder()).folderPath;
    debugCompdataMain("ipc:openFolder:selectedFolder", { selectedFolderPath });
    if (!selectedFolderPath) {
      debugCompdataMain("ipc:openFolder:canceled");
      return { canceled: true };
    }
    try {
      const result = openCompdataWorkspace(selectedFolderPath, (progress) => {
        debugCompdataMain("ipc:openFolder:progress", progress);
        event.sender.send("compdata:progress", progress);
      });
      debugCompdataMain("ipc:openFolder:returning", {
        folderPath: selectedFolderPath,
        projectJsonBytes: result.projectJson.length
      });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      debugCompdataMain("ipc:openFolder:error", { message });
      event.sender.send("compdata:progress", {
        phase: "error",
        currentStep: 0,
        totalSteps: 1,
        percent: 0,
        message
      } satisfies CompdataOpenProgress);
      throw error;
    }
  });
});

ipcMain.handle("compdata:openFolderReference", async (_event, folderPath: string) => {
  return openCompdataReferenceProject(folderPath);
});

ipcMain.handle("compdata:openLocalizationReference", async () => {
  debugCompdataMain("ipc:openLocalizationReference:start");
  return keepWindowDisplayState(async () => {
    const locXmlPath = await pickFile("Open Loc XML Descriptor File", [{ name: "XML files", extensions: ["xml"] }]);
    debugCompdataMain("ipc:openLocalizationReference:xmlSelected", { locXmlPath });
    if (!locXmlPath) {
      debugCompdataMain("ipc:openLocalizationReference:canceledAtXml");
      return { canceled: true, warnings: [] };
    }
    const locDbPath = await pickFile("Open LOC Database File", [{ name: "LOC/DB files", extensions: ["db", "loc"] }]);
    debugCompdataMain("ipc:openLocalizationReference:dbSelected", { locDbPath });
    if (!locDbPath) {
      debugCompdataMain("ipc:openLocalizationReference:canceledAtDb");
      return { canceled: true, warnings: [] };
    }

    const localization = await openDatabaseInWorker(locXmlPath, locDbPath, compdataReferenceTimeoutMs);
    debugCompdataMain("ipc:openLocalizationReference:loaded", {
      title: localization.title,
      tables: localization.tables.length,
      warnings: localization.warnings.length
    });
    return {
      referenceProject: makeLocalizationOnlyReference(localization),
      warnings: []
    };
  });
});

ipcMain.handle("compdata:save", async (_event, project: CompdataProject) => {
  return keepWindowDisplayState(() => {
    const result = saveCompdataProject(project);
    if (result.warnings && result.warnings.length > 0) {
      console.warn("[compdata:save] Warnings while saving compdata:");
      for (const w of result.warnings) {
        console.warn(` - ${w}`);
      }
    }
    return result;
  });
});

ipcMain.handle("project:saveDatabase", async (_event, project: DbProject) => {
  return keepWindowDisplayState(() => {
    const result = saveDatabaseProject(project);
    if (result.warnings && result.warnings.length > 0) {
      console.warn("[project:saveDatabase] Warnings while saving database:");
      for (const w of result.warnings) {
        console.warn(` - ${w}`);
      }
    }
    return result;
  });
});

ipcMain.handle("table:export", async (_event, table: DataTable) => {
  return keepWindowDisplayState(async () => {
    const filePath = await pickSaveFile("Export table", `${table.name}.txt`, [{ name: "Text Unicode files", extensions: ["txt"] }]);
    if (!filePath) {
      return { canceled: true };
    }
    exportTable(table, filePath);
    return { filePath };
  });
});

ipcMain.handle("table:exportAll", async (_event, project: DbProject) => {
  return keepWindowDisplayState(async () => {
    const folderPath = await pickFolder("Select the folder where to export");
    if (!folderPath) {
      return { canceled: true };
    }
    mkdirSync(folderPath, { recursive: true });
    for (const table of project.tables) {
      exportTable(table, join(folderPath, `${table.name}.txt`));
    }
    return { folderPath, count: project.tables.length };
  });
});

ipcMain.handle("table:import", async (_event, expectedName?: string) => {
  return keepWindowDisplayState(async () => {
    const filePath = await pickFile("Import table", [{ name: "Text Unicode files", extensions: ["txt"] }]);
    if (!filePath) {
      return { canceled: true };
    }
    return { table: importTable(filePath, expectedName) };
  });
});

ipcMain.handle("table:importAll", async (_event) => {
  return keepWindowDisplayState(async () => {
    const folderPath = await pickFolder("Select the folder from which to import");
    if (!folderPath) {
      return { canceled: true };
    }
    return { project: openTextFolderProject(folderPath) };
  });
});

ipcMain.handle("hash:language", (_event, values: string[]) => {
  return values.map((value) => toSignedInt32(computeLanguageHash(value)));
});

ipcMain.handle("big:list", async () => {
  return keepWindowDisplayState(async () => {
    const filePath = await pickFile("Open BIG Archive", [{ name: "BIG archives", extensions: ["big"] }]);
    if (!filePath) {
      return { canceled: true };
    }
    return { archivePath: filePath, entries: readBigEntries(filePath) };
  });
});

ipcMain.handle("big:extractDatabases", async () => {
  return keepWindowDisplayState(async () => {
    const filePath = await pickFile("Open BIG Archive", [{ name: "BIG archives", extensions: ["big"] }]);
    if (!filePath) {
      return { canceled: true };
    }
    const outputFolder = await pickFolder("Select extraction folder");
    if (!outputFolder) {
      return { canceled: true };
    }
    const result = extractBig(filePath, outputFolder, ["*.db", "*.xml"]);
    return {
      ...result,
      message: `Extracted ${result.entries.length} database file(s) from ${basename(filePath)}.`
    };
  });
});

ipcMain.handle("visualDependencies:getStatus", () => {
  return visualDependencies().getStatus();
});

ipcMain.handle("visualDependencies:install", (event) => {
  return visualDependencies().installAll((progress) => {
    event.sender.send("visualDependencies:progress", progress);
  });
});

ipcMain.handle("visualDependencies:getMiniface", (_event, playerId: string) => {
  return visualDependencies().getMiniface(playerId);
});

ipcMain.handle("visualDependencies:getTeamCrest", (_event, teamId: string) => {
  return visualDependencies().getTeamCrest(teamId);
});

ipcMain.handle("visualDependencies:getLeagueLogo", (_event, leagueId: string) => {
  return visualDependencies().getLeagueLogo(leagueId);
});

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
