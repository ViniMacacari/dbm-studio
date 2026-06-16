import { app, BrowserWindow, dialog, ipcMain, screen } from "electron";
import { existsSync, mkdirSync } from "node:fs";
import { basename, join } from "node:path";
import { Worker } from "node:worker_threads";
import { computeLanguageHash, toSignedInt32 } from "../core/fifaHash";
import { extractBig, readBigEntries } from "../core/bigArchive";
import { VisualDependencyManager } from "./visualDependencyManager";
import {
  exportTable,
  importTable,
  openTextFolderProject,
  openXmlProject,
  saveDatabaseProject
} from "../core/projectIO";
import type { DataTable, DbProject, LocalizationProject } from "../shared/types";

let mainWindow: BrowserWindow | undefined;
let visualDependencyManager: VisualDependencyManager | undefined;
let lastBlurDisplayState: WindowDisplayState | undefined;
const windowDisplayRestoreDelays = [0, 75, 250, 750, 1500];
const workAreaTolerancePx = 64;

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
  if (!window || window.isDestroyed()) {
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
    if (lastBlurDisplayState) {
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

function openDatabaseInWorker(xmlPath: string, dbPath: string): Promise<DbProject> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(join(__dirname, "openDatabaseWorker.js"), {
      workerData: { xmlPath, dbPath }
    });

    worker.once("message", (message: { project?: DbProject; error?: string }) => {
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

    worker.once("error", reject);
    worker.once("exit", (code) => {
      if (code !== 0) {
        reject(new Error(`Database worker exited with code ${code}.`));
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
    binaryReadMode: project.binaryReadMode
  };
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
    const locDbPath = await pickFile("Open Loc Database File", [{ name: "DB files", extensions: ["db"] }]);
    if (!locDbPath) {
      return { canceled: true };
    }

    const project = await openDatabaseInWorker(xmlPath, dbPath);
    const localization = await openDatabaseInWorker(locXmlPath, locDbPath);
    project.localization = toLocalizationProject(localization);
    project.warnings = [
      ...project.warnings,
      ...localization.warnings.map((warning) => `Localization: ${warning}`)
    ];
    return { project };
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

ipcMain.handle("project:saveDatabase", async (_event, project: DbProject) => {
  return keepWindowDisplayState(() => saveDatabaseProject(project));
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

app.whenReady().then(() => {
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
