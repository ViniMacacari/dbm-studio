import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readDatabaseWithDescriptor } from "../core/databaseReader";
import { saveDatabaseProject } from "../core/databaseWriter";
import { LocalizationService, type LocalizationFieldDraft } from "../renderer/services/localization.service";
import type { DataTable, DbProject, FieldDescriptor, TableDescriptor } from "../shared/types";

const languageFields: FieldDescriptor[] = [
  { name: "stringid", kind: "shortCompressedString", rangeLow: 0, rangeHigh: 0 },
  { name: "sourcetext", kind: "longCompressedString", rangeLow: 0, rangeHigh: 0 },
  { name: "hashid", kind: "integer", rangeLow: -2147483648, rangeHigh: 2147483647, depth: 32 }
];

function languageTable(name: string, rows: string[][]): DataTable {
  return {
    name,
    columns: languageFields.map((field) => field.name),
    fields: languageFields,
    rows
  };
}

function testLanguageTablePartitioning(): void {
  const firstRows = Array.from({ length: 0xffff }, (_value, index) => {
    const hash = Math.round(-2_000_000_000 + index * (3_000_000_000 / 0xfffe));
    return [`existing_${index}`, `Value ${index}`, String(hash)];
  });
  const first = languageTable("LanguageStrings1", firstRows);
  const second = languageTable("LanguageStrings2", [
    ["existing_second_1", "Value", "1500000000"],
    ["existing_second_2", "Value", "2000000000"]
  ]);
  const project = {
    localization: { tables: [first, second] }
  } as DbProject;
  const fields: LocalizationFieldDraft[] = [
    { key: "TeamName_131742", label: "", value: "New Team", fallbackValue: "New Team", found: false },
    { key: "TeamName_Abbr15_131742", label: "", value: "New Team", fallbackValue: "New Team", found: false },
    { key: "TeamName_Abbr10_131742", label: "", value: "New Team", fallbackValue: "New Team", found: false },
    { key: "TeamName_Abbr3_131742", label: "", value: "NEW", fallbackValue: "NEW", found: false }
  ];

  const result = new LocalizationService().applyFields(project, fields);
  assert.deepEqual(result?.changedTables.sort(), ["LanguageStrings1", "LanguageStrings2"]);
  assert.equal(first.rows.length, 0xffff);
  assert.equal(second.rows.length, 6);

  const allRows = [...first.rows, ...second.rows];
  const hashes = allRows.map((row) => Number(row[2]));
  for (let index = 1; index < hashes.length; index += 1) {
    assert.ok(hashes[index - 1] <= hashes[index], `language hashes are out of order at row ${index + 1}`);
  }
  for (const field of fields) {
    assert.equal(allRows.find((row) => row[0] === field.key)?.[1], field.value);
  }
}

const fixtureDescriptor: TableDescriptor = {
  name: "LanguageStrings1",
  shortName: "TAB1",
  fields: [
    { name: "hashid", shortName: "HASH", kind: "integer", rangeLow: -2147483648, rangeHigh: 2147483647, depth: 32 },
    { name: "stringid", shortName: "SKEY", kind: "shortCompressedString", rangeLow: 0, rangeHigh: 0, depth: 32 },
    { name: "sourcetext", shortName: "TEXT", kind: "longCompressedString", rangeLow: 0, rangeHigh: 0, depth: 32 }
  ]
};

function rawCompressedString(value: string, longString: boolean): Buffer {
  const bytes = Buffer.from(value, "utf8");
  const prefix = Buffer.alloc(longString ? 2 : 1);
  if (longString) {
    prefix.writeUInt16BE(bytes.length);
  } else {
    prefix.writeUInt8(bytes.length);
  }
  return Buffer.concat([prefix, bytes]);
}

function makeRawCompressedDatabase(rows: string[][]): Buffer {
  const directory = Buffer.alloc(36);
  Buffer.from([0x44, 0x42, 0x00, 0x08, 0x00, 0x00, 0x00, 0x00]).copy(directory);
  directory.writeUInt32LE(1, 16);
  directory.write("TAB1", 24, "latin1");

  const tableHeader = Buffer.alloc(84);
  const recordSize = 12;
  tableHeader.writeUInt32LE(recordSize, 4);
  tableHeader.writeUInt16LE(rows.length, 16);
  tableHeader.writeUInt16LE(rows.length, 18);
  tableHeader.writeUInt8(3, 24);
  const fieldDefinitions = [
    { type: 3, bitOffset: 0, shortName: "HASH" },
    { type: 13, bitOffset: 32, shortName: "SKEY" },
    { type: 14, bitOffset: 64, shortName: "TEXT" }
  ];
  fieldDefinitions.forEach((field, index) => {
    const offset = 36 + index * 16;
    tableHeader.writeUInt32LE(field.type, offset);
    tableHeader.writeUInt32LE(field.bitOffset, offset + 4);
    tableHeader.write(field.shortName, offset + 8, "latin1");
    tableHeader.writeUInt32LE(32, offset + 12);
  });

  const records = rows.map(() => Buffer.alloc(recordSize));
  const strings: Buffer[] = [];
  let stringOffset = 0;
  rows.forEach((row, index) => {
    records[index].writeUInt32LE(Number(BigInt(row[0]) - BigInt(-2147483648)), 0);
    records[index].writeUInt32LE(stringOffset, 4);
    const key = rawCompressedString(row[1], false);
    strings.push(key);
    stringOffset += key.length;
    records[index].writeUInt32LE(stringOffset, 8);
    const text = rawCompressedString(row[2], true);
    strings.push(text);
    stringOffset += text.length;
  });
  tableHeader.writeUInt32LE(stringOffset > 0 ? stringOffset : 0xffffffff, 12);

  const database = Buffer.concat([directory, tableHeader, ...records, ...strings]);
  database.writeUInt32LE(database.length, 8);
  return database;
}

function testHuffmanSaveRoundTrip(): void {
  const directory = mkdtempSync(join(tmpdir(), "dbm-huffman-test-"));
  const dbPath = join(directory, "localization.db");
  try {
    const initialRows: string[][] = [];
    writeFileSync(dbPath, makeRawCompressedDatabase(initialRows));
    const initialRead = readDatabaseWithDescriptor(readFileSync(dbPath), [fixtureDescriptor]);
    assert.deepEqual(initialRead.tables[0].rows, initialRows);

    const changedRows = [
      ["-10", "First_Key", "Ação inicial"],
      ["20", "Second_Key", "Second value"],
      ["30", "Third_Key", "New compressed value"]
    ];
    const project: DbProject = {
      title: "localization.db",
      sourceKind: "database",
      dbPath,
      descriptors: [fixtureDescriptor],
      tables: [{ ...initialRead.tables[0], rows: changedRows, changed: true }],
      warnings: [],
      binaryReadMode: "descriptor"
    };
    saveDatabaseProject(project);

    const saved = readFileSync(dbPath);
    const reopened = readDatabaseWithDescriptor(saved, [fixtureDescriptor]);
    assert.equal(reopened.mode, "descriptor");
    assert.deepEqual(reopened.tables[0].rows, changedRows);

    const recordsOffset = 36 + 84;
    const compressedBlockOffset = recordsOffset + changedRows.length * 12;
    const firstStringOffset = saved.readUInt32LE(recordsOffset + 4);
    assert.ok(firstStringOffset > 0, "the saved compressed block must contain a Huffman tree");
    assert.equal(firstStringOffset % 4, 0);
    assert.ok(saved.length > compressedBlockOffset + firstStringOffset);

    const originalTree = Buffer.from(saved.subarray(compressedBlockOffset, compressedBlockOffset + firstStringOffset));
    reopened.tables[0].rows[1][2] = "Second valuee";
    reopened.tables[0].changed = true;
    const secondProject: DbProject = {
      title: "localization.db",
      sourceKind: "database",
      dbPath,
      descriptors: [fixtureDescriptor],
      tables: reopened.tables,
      warnings: [],
      binaryReadMode: "descriptor"
    };
    const secondSave = saveDatabaseProject(secondProject);
    assert.equal(secondSave.warnings.some((warning) => warning.includes("rebuilt Huffman tree")), false);

    const savedAgain = readFileSync(dbPath);
    const secondRecordsOffset = 36 + 84;
    const secondBlockOffset = secondRecordsOffset + changedRows.length * 12;
    const secondTreeSize = savedAgain.readUInt32LE(secondRecordsOffset + 4);
    const reusedTree = savedAgain.subarray(secondBlockOffset, secondBlockOffset + secondTreeSize);
    assert.deepEqual(reusedTree, originalTree);
    const reopenedAgain = readDatabaseWithDescriptor(savedAgain, [fixtureDescriptor]);
    assert.equal(reopenedAgain.tables[0].rows[1][2], "Second valuee");

    reopenedAgain.tables[0].rows[1][2] = "Second value 🟣";
    reopenedAgain.tables[0].changed = true;
    const thirdProject: DbProject = {
      ...secondProject,
      tables: reopenedAgain.tables
    };
    const thirdSave = saveDatabaseProject(thirdProject);
    assert.equal(thirdSave.warnings.some((warning) => warning.includes("extended Huffman tree")), true);
    const reopenedThird = readDatabaseWithDescriptor(readFileSync(dbPath), [fixtureDescriptor]);
    assert.equal(reopenedThird.tables[0].rows[1][2], "Second value 🟣");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

testLanguageTablePartitioning();
testHuffmanSaveRoundTrip();
console.log("Database localization regression tests passed.");
