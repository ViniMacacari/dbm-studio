import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { mkdirSync } from "node:fs";
import { basename, join } from "node:path";
import { computeLanguageHash, toSignedInt32 } from "../core/fifaHash";
import { extractBig, readBigEntries } from "../core/bigArchive";
import {
  exportTable,
  importTable,
  openDatabaseProject,
  openTextFolderProject,
  openXmlProject,
  saveSnapshot
} from "../core/projectIO";
import type { DataTable, DbProject } from "../shared/types";

let mainWindow: BrowserWindow | undefined;

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
    title: "DB Master",
    icon: join(process.cwd(), "app.ico"),
    webPreferences: {
      preload: join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  void mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
}

function activeWindow(): BrowserWindow | undefined {
  return mainWindow;
}

async function pickFile(title: string, filters: Electron.FileFilter[]): Promise<string | undefined> {
  const options: Electron.OpenDialogOptions = {
    title,
    properties: ["openFile"],
    filters
  };
  const window = activeWindow();
  const result = window ? await dialog.showOpenDialog(window, options) : await dialog.showOpenDialog(options);
  return result.canceled ? undefined : result.filePaths[0];
}

async function pickFolder(title: string): Promise<string | undefined> {
  const options: Electron.OpenDialogOptions = {
    title,
    properties: ["openDirectory", "createDirectory"]
  };
  const window = activeWindow();
  const result = window ? await dialog.showOpenDialog(window, options) : await dialog.showOpenDialog(options);
  return result.canceled ? undefined : result.filePaths[0];
}

async function pickSaveFile(title: string, defaultPath: string, filters: Electron.FileFilter[]): Promise<string | undefined> {
  const options: Electron.SaveDialogOptions = {
    title,
    defaultPath,
    filters
  };
  const window = activeWindow();
  const result = window ? await dialog.showSaveDialog(window, options) : await dialog.showSaveDialog(options);
  return result.canceled ? undefined : result.filePath;
}

ipcMain.handle("project:openXml", async () => {
  const xmlPath = await pickFile("Open XML Descriptor File", [{ name: "XML files", extensions: ["xml"] }]);
  if (!xmlPath) {
    return { canceled: true };
  }
  return { project: openXmlProject(xmlPath) };
});

ipcMain.handle("project:openDatabase", async () => {
  const xmlPath = await pickFile("Open XML Descriptor File", [{ name: "XML files", extensions: ["xml"] }]);
  if (!xmlPath) {
    return { canceled: true };
  }
  const dbPath = await pickFile("Open Database File", [{ name: "DB files", extensions: ["db"] }]);
  if (!dbPath) {
    return { canceled: true };
  }
  return { project: openDatabaseProject(xmlPath, dbPath) };
});

ipcMain.handle("project:openTextFolder", async () => {
  const folderPath = await pickFolder("Open Exported Tables Folder");
  if (!folderPath) {
    return { canceled: true };
  }
  return { project: openTextFolderProject(folderPath) };
});

ipcMain.handle("project:saveSnapshot", async (_event, project: DbProject) => {
  const filePath = await pickSaveFile("Save Project Snapshot", `${project.title || "dbmaster"}.dbmaster.json`, [
    { name: "DB Master snapshot", extensions: ["json"] }
  ]);
  if (!filePath) {
    return { canceled: true };
  }
  saveSnapshot(project, filePath);
  return { filePath };
});

ipcMain.handle("table:export", async (_event, table: DataTable) => {
  const filePath = await pickSaveFile("Export table", `${table.name}.txt`, [{ name: "Text Unicode files", extensions: ["txt"] }]);
  if (!filePath) {
    return { canceled: true };
  }
  exportTable(table, filePath);
  return { filePath };
});

ipcMain.handle("table:exportAll", async (_event, project: DbProject) => {
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

ipcMain.handle("table:import", async (_event, expectedName?: string) => {
  const filePath = await pickFile("Import table", [{ name: "Text Unicode files", extensions: ["txt"] }]);
  if (!filePath) {
    return { canceled: true };
  }
  return { table: importTable(filePath, expectedName) };
});

ipcMain.handle("table:importAll", async (_event) => {
  const folderPath = await pickFolder("Select the folder from which to import");
  if (!folderPath) {
    return { canceled: true };
  }
  return { project: openTextFolderProject(folderPath) };
});

ipcMain.handle("hash:language", (_event, values: string[]) => {
  return values.map((value) => toSignedInt32(computeLanguageHash(value)));
});

ipcMain.handle("big:list", async () => {
  const filePath = await pickFile("Open BIG Archive", [{ name: "BIG archives", extensions: ["big"] }]);
  if (!filePath) {
    return { canceled: true };
  }
  return { archivePath: filePath, entries: readBigEntries(filePath) };
});

ipcMain.handle("big:extractDatabases", async () => {
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
