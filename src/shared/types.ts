export type FieldKind =
  | "integer"
  | "float"
  | "string"
  | "shortCompressedString"
  | "longCompressedString"
  | "unknown";

export interface FieldDescriptor {
  name: string;
  shortName?: string;
  kind: FieldKind;
  rangeLow: number;
  rangeHigh: number;
  depth?: number;
  bitOffset?: number;
  dbFieldType?: number;
  order?: number;
  raw?: Record<string, unknown>;
}

export interface TableDescriptor {
  name: string;
  shortName?: string;
  fields: FieldDescriptor[];
  recordCount?: number;
  maxInsert?: number;
  maxDelete?: number;
  offset?: number;
  recordSizeBits?: number;
  raw?: Record<string, unknown>;
}

export interface DataTable {
  name: string;
  columns: string[];
  fields: FieldDescriptor[];
  rows: string[][];
  changed?: boolean;
  warning?: string;
}

export interface DbProject {
  title: string;
  sourceKind: "database" | "xml" | "text-folder" | "snapshot";
  xmlPath?: string;
  dbPath?: string;
  folderPath?: string;
  tables: DataTable[];
  descriptors: TableDescriptor[];
  warnings: string[];
  binaryReadMode?: "none" | "descriptor" | "best-effort";
}

export interface OpenResult {
  canceled?: boolean;
  project?: DbProject;
  warnings?: string[];
  error?: string;
}

export interface BigEntry {
  name: string;
  offset: number;
  size: number;
  compressed: boolean;
}

export interface BigExtractResult {
  canceled?: boolean;
  archivePath?: string;
  outputFolder?: string;
  entries: BigEntry[];
  warnings: string[];
}
