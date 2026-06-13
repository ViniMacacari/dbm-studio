import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { parseTextTable, serializeTextTable } from "./textTable";
import { parseXmlDescriptor } from "./xmlDescriptor";
import { makeEmptyTable, readDatabaseWithDescriptor } from "./databaseReader";
import { saveDatabaseProject } from "./databaseWriter";
import type { DataTable, DbProject } from "../shared/types";

export function openXmlProject(xmlPath: string): DbProject {
  const xml = readFileSync(xmlPath, "utf8");
  const parsed = parseXmlDescriptor(xml);
  const tables = parsed.descriptors.map(makeEmptyTable);

  return {
    title: basename(xmlPath),
    sourceKind: "xml",
    xmlPath,
    tables,
    descriptors: parsed.descriptors,
    warnings: parsed.warnings,
    binaryReadMode: "none"
  };
}

export function openDatabaseProject(xmlPath: string, dbPath: string): DbProject {
  const xml = readFileSync(xmlPath, "utf8");
  const db = readFileSync(dbPath);
  const parsed = parseXmlDescriptor(xml);
  const read = readDatabaseWithDescriptor(db, parsed.descriptors);

  return {
    title: basename(dbPath),
    sourceKind: "database",
    xmlPath,
    dbPath,
    tables: read.tables,
    descriptors: parsed.descriptors,
    warnings: [...parsed.warnings, ...read.warnings],
    binaryReadMode: read.mode
  };
}

export function openTextFolderProject(folderPath: string): DbProject {
  const files = readdirSync(folderPath)
    .filter((file) => extname(file).toLowerCase() === ".txt")
    .sort((left, right) => left.localeCompare(right));

  const tables = files.map((file) => parseTextTable(file, readFileSync(join(folderPath, file))));

  return {
    title: basename(folderPath),
    sourceKind: "text-folder",
    folderPath,
    tables,
    descriptors: tables.map((table) => ({
      name: table.name,
      fields: table.fields
    })),
    warnings: files.length === 0 ? ["No .txt tables were found in the selected folder."] : [],
    binaryReadMode: "none"
  };
}

export function exportTable(table: DataTable, filePath: string): void {
  writeFileSync(filePath, serializeTextTable(table));
}

export function importTable(filePath: string, expectedName?: string): DataTable {
  const table = parseTextTable(filePath, readFileSync(filePath));
  if (expectedName) {
    table.name = expectedName;
  }
  return table;
}

export { saveDatabaseProject };
