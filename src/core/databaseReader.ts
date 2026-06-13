import { BitReader } from "./bitBuffer";
import type { DataTable, FieldDescriptor, TableDescriptor } from "../shared/types";

const databaseHeader = Buffer.from([0x44, 0x42, 0x00, 0x08, 0x00, 0x00, 0x00, 0x00]);

function columnsFromDescriptor(table: TableDescriptor): string[] {
  return table.fields.map((field) => field.name);
}

function supportedDepth(field: FieldDescriptor): number | undefined {
  if (field.kind === "float") {
    return 32;
  }
  if (field.depth !== undefined && field.depth > 0) {
    return field.depth;
  }
  return undefined;
}

function hasReadableShape(table: TableDescriptor): boolean {
  if (table.offset === undefined || table.recordCount === undefined) {
    return false;
  }
  return table.fields.every((field) => supportedDepth(field) !== undefined);
}

function decodeFixedString(bytes: Buffer): string {
  const end = bytes.indexOf(0);
  const value = end >= 0 ? bytes.subarray(0, end) : bytes;
  return value
    .toString("utf8")
    .replace(/["\x07\b\f\r\t]/g, "")
    .replace(/\n/g, "\\n");
}

function readField(reader: BitReader, field: FieldDescriptor): string {
  if (field.kind === "float") {
    return String(reader.readFloatLE());
  }

  const depth = supportedDepth(field);
  if (depth === undefined) {
    return "";
  }

  if (field.kind === "string" && depth % 8 === 0) {
    return decodeFixedString(reader.readBytes(depth / 8));
  }

  const raw = reader.readBitsLE(depth);
  const value = field.kind === "integer" ? raw + field.rangeLow : raw;
  return String(value);
}

export function makeEmptyTable(descriptor: TableDescriptor): DataTable {
  return {
    name: descriptor.name,
    columns: columnsFromDescriptor(descriptor),
    fields: descriptor.fields,
    rows: []
  };
}

function readUnsignedBitsLE(record: Buffer, bitOffset: number, depth: number): number {
  let value = 0n;
  for (let bit = 0; bit < depth; bit += 1) {
    const sourceBit = bitOffset + bit;
    const byte = record[sourceBit >> 3] ?? 0;
    if (((byte >> (sourceBit & 7)) & 1) === 1) {
      value |= 1n << BigInt(bit);
    }
  }
  return Number(value);
}

function readShortName(buffer: Buffer, offset: number): string {
  return buffer.subarray(offset, offset + 4).toString("latin1");
}

function descriptorMaps(descriptors: TableDescriptor[]): {
  byShortName: Map<string, TableDescriptor>;
  byName: Map<string, TableDescriptor>;
} {
  const byShortName = new Map<string, TableDescriptor>();
  const byName = new Map<string, TableDescriptor>();
  for (const descriptor of descriptors) {
    byName.set(descriptor.name, descriptor);
    if (descriptor.shortName) {
      byShortName.set(descriptor.shortName, descriptor);
    }
  }
  return { byShortName, byName };
}

function kindFromDbFieldType(dbFieldType: number, xmlField?: FieldDescriptor): FieldDescriptor["kind"] {
  switch (dbFieldType) {
    case 0:
      return "string";
    case 3:
      return "integer";
    case 4:
      return "float";
    default:
      return xmlField?.kind ?? "unknown";
  }
}

function readDbField(record: Buffer, field: FieldDescriptor): string {
  const bitOffset = field.bitOffset ?? 0;
  const depth = field.depth ?? 0;

  switch (field.dbFieldType) {
    case 0: {
      const byteOffset = bitOffset >> 3;
      const byteLength = Math.ceil(depth / 8);
      return decodeFixedString(record.subarray(byteOffset, byteOffset + byteLength));
    }
    case 3: {
      const raw = readUnsignedBitsLE(record, bitOffset, depth);
      return String(raw + field.rangeLow);
    }
    case 4: {
      const byteOffset = bitOffset >> 3;
      if (byteOffset + 4 > record.length) {
        return "";
      }
      return String(record.readFloatLE(byteOffset));
    }
    default: {
      if (depth <= 0) {
        return "";
      }
      return String(readUnsignedBitsLE(record, bitOffset, depth));
    }
  }
}

function readFifaDatabaseByInternalLayout(dbBuffer: Buffer, descriptors: TableDescriptor[]): {
  tables: DataTable[];
  warnings: string[];
  mode: "descriptor" | "best-effort";
} | undefined {
  const headerOffset = dbBuffer.indexOf(databaseHeader);
  if (headerOffset < 0) {
    return undefined;
  }

  const warnings: string[] = [];
  const { byShortName } = descriptorMaps(descriptors);
  const databaseStart = headerOffset;
  const sizeOffset = databaseStart + databaseHeader.length;
  if (sizeOffset + 4 > dbBuffer.length) {
    throw new Error("Database header is truncated.");
  }

  const dbSize = dbBuffer.readUInt32LE(sizeOffset);
  const databaseEnd = databaseStart + dbSize;
  const database = databaseEnd <= dbBuffer.length ? dbBuffer.subarray(databaseStart, databaseEnd) : dbBuffer.subarray(databaseStart);

  let cursor = databaseHeader.length;
  const declaredSize = database.readUInt32LE(cursor);
  cursor += 4;
  if (declaredSize > database.length) {
    warnings.push(`Database size header says ${declaredSize} bytes, but the selected file has ${database.length} readable bytes.`);
  }

  cursor += 4;
  const tableCount = database.readUInt32LE(cursor);
  cursor += 4;
  cursor += 4;

  const tableRefs: Array<{ shortName: string; offset: number }> = [];
  for (let index = 0; index < tableCount; index += 1) {
    if (cursor + 8 > database.length) {
      warnings.push("Table directory ended earlier than expected.");
      break;
    }
    tableRefs.push({
      shortName: readShortName(database, cursor),
      offset: database.readUInt32LE(cursor + 4)
    });
    cursor += 8;
  }

  cursor += 4;
  const tablesStartOffset = cursor;
  const parsedTables = new Map<string, DataTable>();

  for (const tableRef of tableRefs) {
    const descriptor = byShortName.get(tableRef.shortName);
    if (!descriptor) {
      warnings.push(`Unknown DB table shortname ${tableRef.shortName}.`);
      continue;
    }

    let tableCursor = tablesStartOffset + tableRef.offset;
    if (tableCursor + 32 > database.length) {
      warnings.push(`${descriptor.name}: table header is outside the database buffer.`);
      parsedTables.set(descriptor.name, makeEmptyTable(descriptor));
      continue;
    }

    tableCursor += 4;
    const recordSize = database.readUInt32LE(tableCursor);
    tableCursor += 4;
    tableCursor += 10;
    const validRecordsCount = database.readUInt16LE(tableCursor);
    tableCursor += 2;
    tableCursor += 4;
    const fieldsCount = database.readUInt8(tableCursor);
    tableCursor += 1;
    tableCursor += 11;

    const xmlFieldsByShortName = new Map(descriptor.fields.filter((field) => field.shortName).map((field) => [field.shortName as string, field]));
    const dbFields: FieldDescriptor[] = [];

    for (let fieldIndex = 0; fieldIndex < fieldsCount; fieldIndex += 1) {
      if (tableCursor + 16 > database.length) {
        warnings.push(`${descriptor.name}: field directory ended earlier than expected.`);
        break;
      }
      const dbFieldType = database.readUInt32LE(tableCursor);
      const bitOffset = database.readUInt32LE(tableCursor + 4);
      const shortName = readShortName(database, tableCursor + 8);
      const depth = database.readUInt32LE(tableCursor + 12);
      tableCursor += 16;

      const xmlField = xmlFieldsByShortName.get(shortName);
      dbFields.push({
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

    dbFields.sort((left, right) => (left.bitOffset ?? 0) - (right.bitOffset ?? 0));

    const rows: string[][] = [];
    for (let rowIndex = 0; rowIndex < validRecordsCount; rowIndex += 1) {
      const recordOffset = tableCursor + rowIndex * recordSize;
      if (recordOffset + recordSize > database.length) {
        warnings.push(`${descriptor.name}: record ${rowIndex + 1} is outside the database buffer.`);
        break;
      }
      const record = database.subarray(recordOffset, recordOffset + recordSize);
      rows.push(dbFields.map((field) => readDbField(record, field)));
    }

    parsedTables.set(descriptor.name, {
      name: descriptor.name,
      columns: dbFields.map((field) => field.name),
      fields: dbFields,
      rows
    });
  }

  const tables = descriptors.map((descriptor) => {
    const table = parsedTables.get(descriptor.name);
    return table ?? makeEmptyTable(descriptor);
  });

  const parsedCount = [...parsedTables.values()].filter((table) => table.rows.length > 0).length;
  return {
    tables,
    warnings,
    mode: parsedCount === descriptors.length ? "descriptor" : "best-effort"
  };
}

export function readDatabaseWithDescriptor(dbBuffer: Buffer, descriptors: TableDescriptor[]): {
  tables: DataTable[];
  warnings: string[];
  mode: "none" | "descriptor" | "best-effort";
} {
  const internalLayout = readFifaDatabaseByInternalLayout(dbBuffer, descriptors);
  if (internalLayout) {
    return internalLayout;
  }

  const warnings: string[] = dbBuffer.indexOf(databaseHeader) < 0
    ? ["Raw FIFA database header was not found. The selected .db may still be compressed or may not be a FIFA DB file."]
    : [];
  const tables: DataTable[] = [];
  let readableTables = 0;

  for (const descriptor of descriptors) {
    if (!hasReadableShape(descriptor)) {
      const table = makeEmptyTable(descriptor);
      table.warning = "Missing offset, record count, or bit depth information in XML descriptor.";
      tables.push(table);
      warnings.push(`${descriptor.name}: descriptor does not contain enough binary layout information to read rows.`);
      continue;
    }

    const rows: string[][] = [];
    const reader = new BitReader(dbBuffer, descriptor.offset);
    try {
      for (let rowIndex = 0; rowIndex < (descriptor.recordCount ?? 0); rowIndex += 1) {
        const row = descriptor.fields.map((field) => readField(reader, field));
        rows.push(row);
      }
      readableTables += 1;
      tables.push({
        name: descriptor.name,
        columns: columnsFromDescriptor(descriptor),
        fields: descriptor.fields,
        rows
      });
    } catch (error) {
      const table = makeEmptyTable(descriptor);
      table.warning = error instanceof Error ? error.message : String(error);
      tables.push(table);
      warnings.push(`${descriptor.name}: ${table.warning}`);
    }
  }

  if (descriptors.length > 0 && readableTables === 0) {
    warnings.push("The XML was parsed, but no table had enough binary layout data for direct DB reading.");
  }

  return {
    tables,
    warnings,
    mode: readableTables === 0 ? "none" : readableTables === descriptors.length ? "descriptor" : "best-effort"
  };
}
