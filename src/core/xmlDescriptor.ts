import { XMLParser } from "fast-xml-parser";
import { computeBitUsed } from "./fifaHash";
import type { FieldDescriptor, FieldKind, TableDescriptor } from "../shared/types";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  allowBooleanAttributes: true,
  parseAttributeValue: false,
  parseTagValue: false,
  trimValues: true
});

const tableNameKeys = ["name", "tablename", "tableName", "TableName", "Name"];
const fieldNameKeys = ["name", "fieldname", "fieldName", "FieldName", "Name"];
const shortNameKeys = ["shortname", "shortName", "ShortName"];

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function findCaseInsensitive(obj: Record<string, unknown>, names: string[]): unknown {
  for (const name of names) {
    if (obj[name] !== undefined) {
      return obj[name];
    }
  }

  const lowerNames = names.map((name) => name.toLowerCase());
  for (const key of Object.keys(obj)) {
    if (lowerNames.includes(key.toLowerCase())) {
      return obj[key];
    }
  }

  return undefined;
}

function stringValue(obj: Record<string, unknown>, names: string[], fallback = ""): string {
  const value = findCaseInsensitive(obj, names);
  if (value === undefined || value === null) {
    return fallback;
  }
  if (isObject(value) && value["#text"] !== undefined) {
    return String(value["#text"]);
  }
  return String(value);
}

function numberValue(obj: Record<string, unknown>, names: string[]): number | undefined {
  const raw = findCaseInsensitive(obj, names);
  if (raw === undefined || raw === null || raw === "") {
    return undefined;
  }
  const value = Number(String(raw).replace(/^0x/i, ""));
  if (Number.isFinite(value)) {
    return value;
  }
  if (/^0x/i.test(String(raw))) {
    const parsed = Number.parseInt(String(raw), 16);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function normalizeKind(value: string): FieldKind {
  const normalized = value.toLowerCase();
  if (normalized.includes("int")) {
    return "integer";
  }
  if (normalized.includes("float") || normalized.includes("decimal") || normalized.includes("single")) {
    return "float";
  }
  if (normalized.includes("short") && normalized.includes("string")) {
    return "shortCompressedString";
  }
  if (normalized.includes("long") && normalized.includes("string")) {
    return "longCompressedString";
  }
  if (normalized.includes("string") || normalized.includes("char")) {
    return "string";
  }
  return "unknown";
}

function looksLikeField(obj: Record<string, unknown>, keyHint: string): boolean {
  const key = keyHint.toLowerCase();
  return key.includes("field") && findCaseInsensitive(obj, fieldNameKeys) !== undefined;
}

function parseField(obj: Record<string, unknown>, keyHint: string, index: number): FieldDescriptor | undefined {
  const name = stringValue(obj, fieldNameKeys, keyHint.includes("field") ? `field_${index + 1}` : keyHint);
  if (!name || name === "#text") {
    return undefined;
  }

  const rangeLow = numberValue(obj, ["rangelow", "rangeLow", "RangeLow", "min", "Min", "minimum"]) ?? 0;
  const rangeHigh = numberValue(obj, ["rangehigh", "rangeHigh", "RangeHigh", "max", "Max", "maximum"]) ?? -1;
  const rawKind = stringValue(obj, ["type", "Type", "fieldtype", "fieldType", "FieldType", "kind"], "");
  const kind = normalizeKind(rawKind);
  const explicitDepth = numberValue(obj, ["depth", "Depth", "bits", "Bits", "bitCount", "BitCount"]);
  const depth = explicitDepth ?? (kind === "integer" && rangeHigh >= rangeLow ? computeBitUsed(rangeHigh - rangeLow) : undefined);

  return {
    name,
    shortName: stringValue(obj, shortNameKeys, undefined as unknown as string) || undefined,
    kind,
    rangeLow,
    rangeHigh,
    depth,
    bitOffset: numberValue(obj, ["bitoffset", "bitOffset", "BitOffset"]),
    order: numberValue(obj, ["order", "Order", "displayIndex", "DisplayIndex"]),
    raw: obj
  };
}

function collectFields(obj: unknown, keyHint = ""): FieldDescriptor[] {
  const fields: FieldDescriptor[] = [];

  const visit = (node: unknown, key: string): void => {
    if (Array.isArray(node)) {
      node.forEach((item, index) => visit(item, `${key}_${index}`));
      return;
    }
    if (!isObject(node)) {
      return;
    }

    if (looksLikeField(node, key)) {
      const field = parseField(node, key, fields.length);
      if (field && !fields.some((existing) => existing.name === field.name)) {
        fields.push(field);
      }
    }

    for (const [childKey, childValue] of Object.entries(node)) {
      const lower = childKey.toLowerCase();
      if (lower.includes("field")) {
        for (const item of asArray(childValue as Record<string, unknown> | Record<string, unknown>[] | undefined)) {
          visit(item, childKey);
        }
      }
    }
  };

  visit(obj, keyHint);
  return fields;
}

function looksLikeTable(obj: Record<string, unknown>, keyHint: string): boolean {
  const key = keyHint.toLowerCase();
  if (key.includes("field")) {
    return false;
  }
  if (key.includes("table")) {
    return true;
  }
  return findCaseInsensitive(obj, tableNameKeys) !== undefined && collectFields(obj, keyHint).length > 0;
}

function parseTable(obj: Record<string, unknown>, keyHint: string, index: number): TableDescriptor | undefined {
  const name = stringValue(obj, tableNameKeys, keyHint.includes("table") ? `table_${index + 1}` : keyHint);
  const fields = collectFields(obj, keyHint);
  if (!name || fields.length === 0) {
    return undefined;
  }

  fields.sort((left, right) => (left.order ?? 0) - (right.order ?? 0));

  return {
    name,
    shortName: stringValue(obj, shortNameKeys, undefined as unknown as string) || undefined,
    fields,
    recordCount: numberValue(obj, ["recordcount", "recordCount", "RecordCount", "records", "Records", "count", "Count", "numrecords", "NumRecords"]),
    maxInsert: numberValue(obj, ["maxinsert", "maxInsert", "MaxInsert"]),
    maxDelete: numberValue(obj, ["maxdelete", "maxDelete", "MaxDelete"]),
    offset: numberValue(obj, ["offset", "Offset", "start", "Start", "startposition", "StartPosition", "dataoffset", "DataOffset"]),
    recordSizeBits: numberValue(obj, ["recordsizebits", "recordSizeBits", "RecordSizeBits", "bitsperrecord", "BitsPerRecord"]),
    raw: obj
  };
}

export function parseXmlDescriptor(xml: string): { descriptors: TableDescriptor[]; warnings: string[] } {
  const root = parser.parse(xml);
  const descriptors: TableDescriptor[] = [];
  const warnings: string[] = [];

  const visit = (node: unknown, keyHint: string): void => {
    if (Array.isArray(node)) {
      node.forEach((item, index) => visit(item, `${keyHint}_${index}`));
      return;
    }
    if (!isObject(node)) {
      return;
    }

    if (looksLikeTable(node, keyHint)) {
      const table = parseTable(node, keyHint, descriptors.length);
      if (table && !descriptors.some((existing) => existing.name === table.name)) {
        descriptors.push(table);
        return;
      }
    }

    for (const [key, value] of Object.entries(node)) {
      visit(value, key);
    }
  };

  visit(root, "root");

  if (descriptors.length === 0) {
    warnings.push("No table descriptors were found in the XML file.");
  }

  return { descriptors, warnings };
}
