import { basename, extname } from "node:path";
import type { DataTable, FieldDescriptor } from "../shared/types";

function decodeBuffer(buffer: Buffer): string {
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return buffer.subarray(2).toString("utf16le");
  }

  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
    const swapped = Buffer.alloc(buffer.length - 2);
    for (let i = 2; i < buffer.length; i += 2) {
      swapped[i - 2] = buffer[i + 1] ?? 0;
      swapped[i - 1] = buffer[i];
    }
    return swapped.toString("utf16le");
  }

  let zeroOdd = 0;
  let zeroEven = 0;
  const sample = Math.min(buffer.length, 4000);
  for (let i = 0; i < sample; i += 1) {
    if (buffer[i] === 0) {
      if (i % 2 === 0) {
        zeroEven += 1;
      } else {
        zeroOdd += 1;
      }
    }
  }

  if (zeroOdd > zeroEven * 2 && zeroOdd > sample / 5) {
    return buffer.toString("utf16le");
  }

  return buffer.toString("utf8");
}

function unescapeCell(value: string): string {
  return value
    .replace(/\\r/g, "\r")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t");
}

function escapeCell(value: unknown): string {
  return String(value ?? "")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
}

function makeFields(columns: string[]): FieldDescriptor[] {
  return columns.map((name) => ({
    name,
    kind: "unknown",
    rangeLow: 0,
    rangeHigh: -1
  }));
}

export function parseTextTable(fileName: string, buffer: Buffer): DataTable {
  const text = decodeBuffer(buffer).replace(/^\ufeff/, "");
  const rows = text.split(/\r\n|\n|\r/).filter((line) => line.length > 0);
  const tableName = basename(fileName, extname(fileName));

  if (rows.length === 0) {
    return {
      name: tableName,
      columns: [],
      fields: [],
      rows: []
    };
  }

  const columns = rows[0].split("\t").map(unescapeCell);
  const data = rows.slice(1).map((line) => {
    const cells = line.split("\t").map(unescapeCell);
    while (cells.length < columns.length) {
      cells.push("");
    }
    return cells.slice(0, columns.length);
  });

  return {
    name: tableName,
    columns,
    fields: makeFields(columns),
    rows: data
  };
}

export function serializeTextTable(table: DataTable): Buffer {
  const lines = [
    table.columns.map(escapeCell).join("\t"),
    ...table.rows.map((row) => table.columns.map((_, index) => escapeCell(row[index])).join("\t"))
  ];
  const body = `${lines.join("\r\n")}\r\n`;
  return Buffer.from(`\ufeff${body}`, "utf16le");
}
