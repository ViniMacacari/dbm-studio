# DB Master Electron

Electron + Angular + TypeScript rewrite of the WinForms DB Master UI.

## Commands

```bash
npm install
npm run dev
npm run build
npm run dist -- --linux dir
```

The packaged Linux directory is generated at:

```text
dist/linux-unpacked/dbmaster-electron-ts
```

## Implemented

- Angular renderer UI running inside Electron.
- Open DB/XML pair through Electron dialogs.
- Open folders containing exported DB Master `.txt` tables.
- Browse tables, edit cells, sort columns and search values.
- Copy, paste, replace, delete and count records.
- Import/export one table or all tables using UTF-16 tab-delimited text.
- Save raw DB files opened through a DB/XML pair, with an automatic `.bak` backup.
- Calculate `hashid` values from `stringid` using the EA language hash routine.
- Parse XML/meta descriptors flexibly.
- DB binary read for raw `DB 00 08` FIFA databases using the table directory and field bit offsets stored inside the `.db`.
- Extract `.db` and `.xml` entries from `BIGF`/`BIG4` archives.

## Notes

The original WinForms app delegates the exact `.db`, `.bh` and compression behavior to `FifaLibrary14.dll`, which is not present in this source tree. The Electron rewrite is TypeScript-only, so raw uncompressed DB files opened by the binary reader can be saved directly, while compressed DB payloads and BH hide/regeneration are intentionally not faked.

The raw DB reader follows the public parser shape from `sammygriffiths/fifa-career-save-parser`.
