import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import type { DataTable, DbProject, FieldDescriptor, LocalizationProject, TableDescriptor } from "../shared/types";

const databaseHeader = Buffer.from([0x44, 0x42, 0x00, 0x08, 0x00, 0x00, 0x00, 0x00]);
const noCompressedStringBlockLength = 0xffffffff;

interface WritableField extends FieldDescriptor {
  bitOffset: number;
  depth: number;
  dbFieldType: number;
}

interface TableWriteLayout {
  name: string;
  tableStart: number;
  tableEnd: number;
  recordsCountOffset: number;
  validRecordsCountOffset: number;
  recordsCount: number;
  recordSize: number;
  fields: WritableField[];
  recordsOffset: number;
  capacity: number;
  hasCompressedStrings: boolean;
}

interface TableReference {
  shortName: string;
  offset: number;
  offsetPosition: number;
  tableStart: number;
}

interface WritableLayoutParse {
  databaseStart: number;
  dbSize: number;
  tableRefs: TableReference[];
  layouts: TableWriteLayout[];
  warnings: string[];
}

interface SaveDatabaseResult {
  filePath: string;
  backupPath?: string;
  warnings: string[];
  tablesWritten: number;
}

function readShortName(buffer: Buffer, offset: number): string {
  return buffer.subarray(offset, offset + 4).toString("latin1");
}

function normalizeCompressedStringLength(length: number): number {
  return length === noCompressedStringBlockLength ? 0 : length;
}

function descriptorMaps(descriptors: TableDescriptor[]): {
  byShortName: Map<string, TableDescriptor>;
} {
  const byShortName = new Map<string, TableDescriptor>();
  for (const descriptor of descriptors) {
    if (descriptor.shortName) {
      byShortName.set(descriptor.shortName, descriptor);
    }
  }
  return { byShortName };
}

function kindFromDbFieldType(dbFieldType: number, xmlField?: FieldDescriptor): FieldDescriptor["kind"] {
  switch (dbFieldType) {
    case 0:
      return "string";
    case 3:
      return "integer";
    case 4:
      return "float";
    case 13:
      return "shortCompressedString";
    case 14:
      return "longCompressedString";
    default:
      return xmlField?.kind ?? "unknown";
  }
}

function parseWritableLayouts(dbBuffer: Buffer, descriptors: TableDescriptor[]): WritableLayoutParse {
  const databaseStart = dbBuffer.indexOf(databaseHeader);
  if (databaseStart < 0) {
    throw new Error("Raw FIFA database header was not found. Save supports only uncompressed DB files opened successfully by the binary reader.");
  }

  const warnings: string[] = [];
  const sizeOffset = databaseStart + databaseHeader.length;
  if (sizeOffset + 4 > dbBuffer.length) {
    throw new Error("Database header is truncated.");
  }

  const dbSize = dbBuffer.readUInt32LE(sizeOffset);
  const databaseEnd = Math.min(databaseStart + dbSize, dbBuffer.length);
  if (databaseEnd <= databaseStart || databaseEnd > dbBuffer.length) {
    throw new Error("Database size header is invalid.");
  }

  let cursor = sizeOffset;
  const declaredSize = dbBuffer.readUInt32LE(cursor);
  cursor += 4;
  if (databaseStart + declaredSize > dbBuffer.length) {
    warnings.push(`Database size header says ${declaredSize} bytes, but the selected file has ${dbBuffer.length - databaseStart} bytes.`);
  }

  cursor += 4;
  if (cursor + 8 > databaseEnd) {
    throw new Error("Database table directory is truncated.");
  }
  const tableCount = dbBuffer.readUInt32LE(cursor);
  cursor += 4;
  cursor += 4;

  const tableRefs: TableReference[] = [];
  for (let index = 0; index < tableCount; index += 1) {
    if (cursor + 8 > databaseEnd) {
      warnings.push("Table directory ended earlier than expected.");
      break;
    }
    const offset = dbBuffer.readUInt32LE(cursor + 4);
    tableRefs.push({
      shortName: readShortName(dbBuffer, cursor),
      offset,
      offsetPosition: cursor + 4,
      tableStart: 0
    });
    cursor += 8;
  }

  cursor += 4;
  const tablesStartOffset = cursor;
  tableRefs.forEach((tableRef) => {
    tableRef.tableStart = tablesStartOffset + tableRef.offset;
  });
  const tableStarts = tableRefs
    .map((tableRef) => tableRef.tableStart)
    .filter((offset) => offset >= tablesStartOffset && offset < databaseEnd)
    .sort((left, right) => left - right);

  const nextTableStart = (tableStart: number): number => tableStarts.find((offset) => offset > tableStart) ?? databaseEnd;
  const { byShortName } = descriptorMaps(descriptors);
  const layouts: TableWriteLayout[] = [];

  for (const tableRef of tableRefs) {
    const descriptor = byShortName.get(tableRef.shortName);
    if (!descriptor) {
      warnings.push(`Unknown DB table shortname ${tableRef.shortName}.`);
      continue;
    }

    const tableStart = tableRef.tableStart;
    if (tableStart < tablesStartOffset || tableStart + 32 > databaseEnd) {
      warnings.push(`${descriptor.name}: table header is outside the database buffer.`);
      continue;
    }

    let tableCursor = tableStart;
    tableCursor += 4;
    const recordSize = dbBuffer.readUInt32LE(tableCursor);
    tableCursor += 4;
    tableCursor += 4;
    const compressedStringLength = normalizeCompressedStringLength(dbBuffer.readUInt32LE(tableCursor));
    tableCursor += 4;
    const recordsCountOffset = tableCursor;
    const recordsCount = dbBuffer.readUInt16LE(tableCursor);
    tableCursor += 2;
    const validRecordsCountOffset = tableCursor;
    tableCursor += 2;
    tableCursor += 4;
    const fieldsCount = dbBuffer.readUInt8(tableCursor);
    tableCursor += 1;
    tableCursor += 11;

    const xmlFieldsByShortName = new Map(descriptor.fields.filter((field) => field.shortName).map((field) => [field.shortName as string, field]));
    const fields: WritableField[] = [];

    for (let fieldIndex = 0; fieldIndex < fieldsCount; fieldIndex += 1) {
      if (tableCursor + 16 > databaseEnd) {
        warnings.push(`${descriptor.name}: field directory ended earlier than expected.`);
        break;
      }

      const dbFieldType = dbBuffer.readUInt32LE(tableCursor);
      const bitOffset = dbBuffer.readUInt32LE(tableCursor + 4);
      const shortName = readShortName(dbBuffer, tableCursor + 8);
      const depth = dbBuffer.readUInt32LE(tableCursor + 12);
      tableCursor += 16;

      const xmlField = xmlFieldsByShortName.get(shortName);
      fields.push({
        name: xmlField?.name ?? shortName,
        shortName,
        kind: kindFromDbFieldType(dbFieldType, xmlField),
        rangeLow: xmlField?.rangeLow ?? 0,
        rangeHigh: xmlField?.rangeHigh ?? -1,
        depth,
        bitOffset,
        dbFieldType,
        raw: xmlField?.raw
      });
    }

    fields.sort((left, right) => left.bitOffset - right.bitOffset);
    const recordsOffset = tableCursor;
    const tableEnd = nextTableStart(tableStart);

    layouts.push({
      name: descriptor.name,
      tableStart,
      tableEnd,
      recordsCountOffset,
      validRecordsCountOffset,
      recordsCount,
      recordSize,
      fields,
      recordsOffset,
      capacity: recordsCount,
      hasCompressedStrings: compressedStringLength > 0 || fields.some((field) => field.dbFieldType === 13 || field.dbFieldType === 14)
    });
  }

  return { databaseStart, dbSize, tableRefs, layouts, warnings };
}

function parseInteger(value: string, context: string): bigint {
  const normalized = value.trim();
  if (!/^-?\d+$/.test(normalized)) {
    throw new Error(`${context}: invalid integer value "${value}".`);
  }
  return BigInt(normalized);
}

function writeUnsignedBitsLE(record: Buffer, bitOffset: number, depth: number, value: bigint, context: string): void {
  if (depth <= 0) {
    throw new Error(`${context}: invalid bit depth ${depth}.`);
  }
  if (value < 0n) {
    throw new Error(`${context}: value is below the field range.`);
  }
  const maxValue = 1n << BigInt(depth);
  if (value >= maxValue) {
    throw new Error(`${context}: value does not fit in ${depth} bits.`);
  }

  for (let bit = 0; bit < depth; bit += 1) {
    const targetBit = bitOffset + bit;
    const byteIndex = targetBit >> 3;
    if (byteIndex >= record.length) {
      throw new Error(`${context}: field is outside the record buffer.`);
    }
    const mask = 1 << (targetBit & 7);
    record[byteIndex] &= ~mask;
    if (((value >> BigInt(bit)) & 1n) === 1n) {
      record[byteIndex] |= mask;
    }
  }
}

function encodeFixedString(value: string, byteLength: number): Buffer {
  const clean = value.replace(/\\n/g, "\n");
  let end = clean.length;
  while (end > 0 && Buffer.byteLength(clean.slice(0, end), "utf8") > byteLength) {
    end -= 1;
  }

  const output = Buffer.alloc(byteLength);
  Buffer.from(clean.slice(0, end), "utf8").copy(output);
  return output;
}

function writeDbField(record: Buffer, field: WritableField, value: string, context: string): void {
  switch (field.dbFieldType) {
    case 0: {
      const byteOffset = field.bitOffset >> 3;
      const byteLength = Math.ceil(field.depth / 8);
      if (byteOffset + byteLength > record.length) {
        throw new Error(`${context}: string field is outside the record buffer.`);
      }
      encodeFixedString(value, byteLength).copy(record, byteOffset);
      return;
    }
    case 3: {
      const raw = parseInteger(value, context) - BigInt(field.rangeLow);
      writeUnsignedBitsLE(record, field.bitOffset, field.depth, raw, context);
      return;
    }
    case 4: {
      const byteOffset = field.bitOffset >> 3;
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) {
        throw new Error(`${context}: invalid float value "${value}".`);
      }
      if (byteOffset + 4 > record.length) {
        throw new Error(`${context}: float field is outside the record buffer.`);
      }
      record.writeFloatLE(numeric, byteOffset);
      return;
    }
    case 13: {
      const raw = parseInteger(value, context);
      writeUnsignedBitsLE(record, field.bitOffset, 32, raw, context);
      return;
    }
    case 14: {
      const raw = parseInteger(value, context);
      writeUnsignedBitsLE(record, field.bitOffset, 64, raw, context);
      return;
    }
    default: {
      const raw = parseInteger(value, context);
      writeUnsignedBitsLE(record, field.bitOffset, field.depth, raw, context);
    }
  }
}

function fieldFitsRecord(field: WritableField, recordSize: number): boolean {
  if (field.depth <= 0 || field.bitOffset < 0) {
    return false;
  }

  switch (field.dbFieldType) {
    case 0: {
      const byteOffset = field.bitOffset >> 3;
      const byteLength = Math.ceil(field.depth / 8);
      return byteOffset + byteLength <= recordSize;
    }
    case 4: {
      const byteOffset = field.bitOffset >> 3;
      return byteOffset + 4 <= recordSize;
    }
    case 13:
    case 14:
      return false;
    default:
      return field.bitOffset + field.depth <= recordSize * 8;
  }
}

function sumShiftBefore(expansions: Array<{ insertOffset: number; extraBytes: number }>, offset: number): number {
  return expansions
    .filter((expansion) => expansion.insertOffset < offset)
    .reduce((total, expansion) => total + expansion.extraBytes, 0);
}

function expandDatabaseForChangedRows(
  dbBuffer: Buffer,
  parsed: WritableLayoutParse,
  tablesByName: Map<string, DataTable>,
  warnings: string[]
): Buffer {
  const expansions: Array<{ layout: TableWriteLayout; insertOffset: number; extraBytes: number; rowCount: number }> = [];

  for (const layout of parsed.layouts) {
    const table = tablesByName.get(layout.name);
    if (!table || table.rows.length <= layout.capacity) {
      continue;
    }
    if (table.rows.length > 0xffff) {
      throw new Error(`${layout.name}: DB table row count exceeds the 16-bit record counter.`);
    }
    if (layout.hasCompressedStrings) {
      throw new Error(`${layout.name}: inserting rows into compressed-string tables is not supported yet.`);
    }
    const missingRows = table.rows.length - layout.capacity;
    expansions.push({
      layout,
      insertOffset: layout.recordsOffset + layout.recordsCount * layout.recordSize,
      extraBytes: missingRows * layout.recordSize,
      rowCount: table.rows.length
    });
  }

  if (expansions.length === 0) {
    return dbBuffer;
  }

  expansions.sort((left, right) => left.insertOffset - right.insertOffset);
  let output = Buffer.from(dbBuffer);
  let totalInserted = 0;
  for (const expansion of expansions) {
    const adjustedInsertOffset = expansion.insertOffset + totalInserted;
    output = Buffer.concat([
      output.subarray(0, adjustedInsertOffset),
      Buffer.alloc(expansion.extraBytes),
      output.subarray(adjustedInsertOffset)
    ]);
    totalInserted += expansion.extraBytes;
    warnings.push(`${expansion.layout.name}: expanded DB allocation by ${expansion.extraBytes} bytes for ${expansion.rowCount} rows.`);
  }

  output.writeUInt32LE(parsed.dbSize + totalInserted, parsed.databaseStart + databaseHeader.length);

  for (const tableRef of parsed.tableRefs) {
    const shift = sumShiftBefore(expansions, tableRef.tableStart);
    if (shift > 0) {
      output.writeUInt32LE(tableRef.offset + shift, tableRef.offsetPosition);
    }
  }

  for (const expansion of expansions) {
    const shiftedRecordsCountOffset = expansion.layout.recordsCountOffset + sumShiftBefore(expansions, expansion.layout.tableStart);
    const shiftedValidRecordsCountOffset = expansion.layout.validRecordsCountOffset + sumShiftBefore(expansions, expansion.layout.tableStart);
    output.writeUInt16LE(expansion.rowCount, shiftedRecordsCountOffset);
    output.writeUInt16LE(expansion.rowCount, shiftedValidRecordsCountOffset);
  }

  return output;
}

type WritableDatabaseProject = DbProject | LocalizationProject;

function saveSingleDatabaseProject(project: WritableDatabaseProject): SaveDatabaseResult {
  if (project.sourceKind !== "database" || !project.dbPath) {
    throw new Error("Open a DB/XML pair before saving a .db file.");
  }

  const original = readFileSync(project.dbPath);
  let output: Buffer = Buffer.from(original);
  let parsed = parseWritableLayouts(output, project.descriptors);
  const warnings = [...parsed.warnings];
  const changedTables = project.tables.filter((table) => table.changed);
  const tablesByName = new Map<string, DataTable>(changedTables.map((table) => [table.name, table]));
  let tablesWritten = 0;

  if (changedTables.length === 0) {
    return {
      filePath: project.dbPath,
      warnings,
      tablesWritten
    };
  }

  const expandedOutput = expandDatabaseForChangedRows(output, parsed, tablesByName, warnings);
  if (expandedOutput.length !== output.length) {
    output = expandedOutput;
    parsed = parseWritableLayouts(output, project.descriptors);
    warnings.push(...parsed.warnings);
  }

  for (const layout of parsed.layouts) {
    const table = tablesByName.get(layout.name);
    if (!table) {
      continue;
    }
    if (table.rows.length > layout.capacity) {
      throw new Error(`${layout.name}: ${table.rows.length} rows do not fit in the original DB allocation (${layout.capacity}).`);
    }
    if (table.rows.length > 0xffff) {
      throw new Error(`${layout.name}: DB table row count exceeds the 16-bit record counter.`);
    }

    const writableFields = layout.fields.map((field) => fieldFitsRecord(field, layout.recordSize));
    writableFields.forEach((writable, columnIndex) => {
      if (!writable) {
        const field = layout.fields[columnIndex];
        warnings.push(`${layout.name}.${field.name}: field is outside the record buffer and was left unchanged.`);
      }
    });

    output.writeUInt16LE(table.rows.length, layout.recordsCountOffset);
    output.writeUInt16LE(table.rows.length, layout.validRecordsCountOffset);
    for (let rowIndex = 0; rowIndex < table.rows.length; rowIndex += 1) {
      const recordOffset = layout.recordsOffset + rowIndex * layout.recordSize;
      const record = output.subarray(recordOffset, recordOffset + layout.recordSize);
      const row = table.rows[rowIndex];
      for (let columnIndex = 0; columnIndex < layout.fields.length; columnIndex += 1) {
        if (!writableFields[columnIndex]) {
          continue;
        }
        const field = layout.fields[columnIndex];
        const context = `${layout.name} row ${rowIndex + 1}, ${field.name}`;
        writeDbField(record, field, row[columnIndex] ?? "", context);
      }
    }
    tablesWritten += 1;
  }

  if (tablesWritten === 0) {
    throw new Error("No changed DB tables were writable.");
  }

  const backupPath = `${project.dbPath}.bak`;
  copyFileSync(project.dbPath, backupPath);
  writeFileSync(project.dbPath, output);

  return {
    filePath: project.dbPath,
    backupPath,
    warnings,
    tablesWritten
  };
}

export function saveDatabaseProject(project: DbProject): SaveDatabaseResult {
  const mainResult = saveSingleDatabaseProject(project);
  if (!project.localization) {
    return mainResult;
  }

  const localizationResult = saveSingleDatabaseProject(project.localization);
  return {
    filePath: mainResult.filePath,
    backupPath: mainResult.backupPath,
    warnings: [
      ...mainResult.warnings,
      ...localizationResult.warnings.map((warning) => `Localization: ${warning}`)
    ],
    tablesWritten: mainResult.tablesWritten + localizationResult.tablesWritten
  };
}
