import { Injectable } from "@angular/core";
import type { DataTable, DbProject } from "../shared/types";

export interface PlayerEditorNameDraft {
  firstname: string;
  surname: string;
  commonname: string;
  playerjerseyname: string;
}

export interface PlayerResolvedNames extends PlayerEditorNameDraft {
  source: "editedplayernames" | "dcplayernames" | "playernames" | "compressed" | "empty";
}

export interface PlayerEditorFieldDraft {
  column: string;
  label: string;
  value: string;
  inputType: "number" | "text";
  readonly?: boolean;
  min?: number;
  max?: number;
  relation?: string;
}

export interface PlayerEditorSectionDraft {
  id: string;
  title: string;
  fields: PlayerEditorFieldDraft[];
}

export interface PlayerEditorDraft {
  playerId: string;
  rowIndex: number;
  displayName: string;
  nameSource: PlayerResolvedNames["source"];
  nameIds: PlayerEditorNameDraft;
  nationalityName?: string;
  birthDateIso?: string;
  age?: number;
  namesAvailable: boolean;
  names: PlayerEditorNameDraft;
  identityFields: PlayerEditorFieldDraft[];
  sections: PlayerEditorSectionDraft[];
}

interface FieldDefinition {
  column: string;
  label: string;
  inputType?: "number" | "text";
  readonly?: boolean;
  min?: number;
  max?: number;
}

interface SectionDefinition {
  id: string;
  title: string;
  fields: FieldDefinition[];
}

interface NameResolution {
  value: string;
  source: PlayerResolvedNames["source"];
}

@Injectable({ providedIn: "root" })
export class PlayerEditorService {
  private readonly identityFields: FieldDefinition[] = [
    { column: "playerid", label: "Player ID", readonly: true },
    { column: "nationality", label: "Nationality" },
    { column: "birthdate", label: "Birth date code" },
    { column: "height", label: "Height" },
    { column: "weight", label: "Weight" },
    { column: "preferredfoot", label: "Preferred foot" },
    { column: "gender", label: "Gender" },
    { column: "contractvaliduntil", label: "Contract until" },
    { column: "playerjointeamdate", label: "Join date code" },
    { column: "isretiring", label: "Retiring" },
    { column: "iscustomized", label: "Customized" },
    { column: "usercaneditname", label: "Editable name" }
  ];

  private readonly sections: SectionDefinition[] = [
    {
      id: "profile",
      title: "Profile",
      fields: [
        { column: "overallrating", label: "Overall", min: 0, max: 99 },
        { column: "potential", label: "Potential", min: 0, max: 99 },
        { column: "internationalrep", label: "International rep", min: 0, max: 5 },
        { column: "skillmoves", label: "Skill moves", min: 0, max: 5 },
        { column: "weakfootabilitytypecode", label: "Weak foot", min: 0, max: 5 },
        { column: "preferredposition1", label: "Position 1" },
        { column: "preferredposition2", label: "Position 2" },
        { column: "preferredposition3", label: "Position 3" },
        { column: "preferredposition4", label: "Position 4" }
      ]
    },
    {
      id: "attributes",
      title: "Attributes",
      fields: [
        { column: "pacdiv", label: "Pace/Diving", min: 0, max: 99 },
        { column: "shohan", label: "Shooting/Handling", min: 0, max: 99 },
        { column: "paskic", label: "Passing/Kicking", min: 0, max: 99 },
        { column: "driref", label: "Dribbling/Reflexes", min: 0, max: 99 },
        { column: "defspe", label: "Defending/Speed", min: 0, max: 99 },
        { column: "phypos", label: "Physical/Positioning", min: 0, max: 99 },
        { column: "acceleration", label: "Acceleration", min: 0, max: 99 },
        { column: "sprintspeed", label: "Sprint speed", min: 0, max: 99 },
        { column: "agility", label: "Agility", min: 0, max: 99 },
        { column: "balance", label: "Balance", min: 0, max: 99 },
        { column: "reactions", label: "Reactions", min: 0, max: 99 },
        { column: "stamina", label: "Stamina", min: 0, max: 99 },
        { column: "strength", label: "Strength", min: 0, max: 99 },
        { column: "jumping", label: "Jumping", min: 0, max: 99 }
      ]
    },
    {
      id: "attacking",
      title: "Ball And Attack",
      fields: [
        { column: "crossing", label: "Crossing", min: 0, max: 99 },
        { column: "finishing", label: "Finishing", min: 0, max: 99 },
        { column: "headingaccuracy", label: "Heading", min: 0, max: 99 },
        { column: "shortpassing", label: "Short passing", min: 0, max: 99 },
        { column: "volleys", label: "Volleys", min: 0, max: 99 },
        { column: "dribbling", label: "Dribbling", min: 0, max: 99 },
        { column: "curve", label: "Curve", min: 0, max: 99 },
        { column: "freekickaccuracy", label: "Free kicks", min: 0, max: 99 },
        { column: "longpassing", label: "Long passing", min: 0, max: 99 },
        { column: "ballcontrol", label: "Ball control", min: 0, max: 99 },
        { column: "shotpower", label: "Shot power", min: 0, max: 99 },
        { column: "longshots", label: "Long shots", min: 0, max: 99 },
        { column: "penalties", label: "Penalties", min: 0, max: 99 },
        { column: "vision", label: "Vision", min: 0, max: 99 },
        { column: "composure", label: "Composure", min: 0, max: 99 },
        { column: "positioning", label: "Positioning", min: 0, max: 99 }
      ]
    },
    {
      id: "defense",
      title: "Defense",
      fields: [
        { column: "interceptions", label: "Interceptions", min: 0, max: 99 },
        { column: "defensiveawareness", label: "Def. awareness", min: 0, max: 99 },
        { column: "standingtackle", label: "Standing tackle", min: 0, max: 99 },
        { column: "slidingtackle", label: "Sliding tackle", min: 0, max: 99 },
        { column: "aggression", label: "Aggression", min: 0, max: 99 }
      ]
    },
    {
      id: "goalkeeper",
      title: "Goalkeeper",
      fields: [
        { column: "gkdiving", label: "GK diving", min: 0, max: 99 },
        { column: "gkhandling", label: "GK handling", min: 0, max: 99 },
        { column: "gkkicking", label: "GK kicking", min: 0, max: 99 },
        { column: "gkreflexes", label: "GK reflexes", min: 0, max: 99 },
        { column: "gkpositioning", label: "GK positioning", min: 0, max: 99 },
        { column: "gksavetype", label: "GK save type" },
        { column: "gkkickstyle", label: "GK kick style" },
        { column: "gkglovetypecode", label: "GK gloves" }
      ]
    },
    {
      id: "traits",
      title: "Traits",
      fields: [
        { column: "trait1", label: "Trait 1" },
        { column: "trait2", label: "Trait 2" },
        { column: "icontrait1", label: "Icon trait 1" },
        { column: "icontrait2", label: "Icon trait 2" },
        { column: "personality", label: "Personality" },
        { column: "skillmoveslikelihood", label: "Skill move likelihood" },
        { column: "modifier", label: "Modifier" },
        { column: "role1", label: "Role 1" },
        { column: "role2", label: "Role 2" },
        { column: "role3", label: "Role 3" }
      ]
    },
    {
      id: "appearance",
      title: "Appearance",
      fields: [
        { column: "headassetid", label: "Head asset" },
        { column: "headtypecode", label: "Head type" },
        { column: "headclasscode", label: "Head class" },
        { column: "headvariation", label: "Head variation" },
        { column: "bodytypecode", label: "Body type" },
        { column: "skintonecode", label: "Skin tone" },
        { column: "skintypecode", label: "Skin type" },
        { column: "skincomplexion", label: "Skin complexion" },
        { column: "hairtypecode", label: "Hair type" },
        { column: "hairstylecode", label: "Hair style" },
        { column: "haircolorcode", label: "Hair color" },
        { column: "facialhairtypecode", label: "Facial hair" },
        { column: "facialhaircolorcode", label: "Facial hair color" },
        { column: "eyecolorcode", label: "Eye color" },
        { column: "eyebrowcode", label: "Eyebrows" },
        { column: "shoetypecode", label: "Shoe type" },
        { column: "shoedesigncode", label: "Shoe design" },
        { column: "shoecolorcode1", label: "Shoe color 1" },
        { column: "shoecolorcode2", label: "Shoe color 2" },
        { column: "jerseystylecode", label: "Jersey style" },
        { column: "jerseysleevelengthcode", label: "Sleeves" },
        { column: "jerseyfit", label: "Jersey fit" }
      ]
    }
  ];

  findPlayersTable(project?: DbProject): DataTable | undefined {
    return this.findTable(project, "players");
  }

  findNamesTable(project?: DbProject): DataTable | undefined {
    return this.findTable(project, "editedplayernames");
  }

  resolvePlayerName(project: DbProject | undefined, rowIndex: number): string {
    if (!project) {
      return "";
    }
    const players = this.findPlayersTable(project);
    if (!players || !players.rows[rowIndex]) {
      return "";
    }

    const playerId = this.read(players, rowIndex, "playerid");
    const names = this.resolveNames(project, players, rowIndex, playerId);
    return this.displayName(names, playerId);
  }

  isPlayersTable(table?: DataTable): boolean {
    return table?.name.toLowerCase() === "players";
  }

  createDraft(project: DbProject, rowIndex: number): PlayerEditorDraft | undefined {
    const players = this.findPlayersTable(project);
    if (!players || !players.rows[rowIndex]) {
      return undefined;
    }

    const playerId = this.read(players, rowIndex, "playerid");
    const names = this.resolveNames(project, players, rowIndex, playerId);
    const displayName = this.displayName(names, playerId);
    const birthdate = this.read(players, rowIndex, "birthdate");
    const birthDateIso = this.decodeFifaDate(birthdate);
    const nationalityName = this.resolveNation(project, this.read(players, rowIndex, "nationality"));

    return {
      playerId,
      rowIndex,
      displayName,
      nameSource: names.source,
      nameIds: {
        firstname: this.read(players, rowIndex, "firstnameid"),
        surname: this.read(players, rowIndex, "lastnameid"),
        commonname: this.read(players, rowIndex, "commonnameid"),
        playerjerseyname: this.read(players, rowIndex, "playerjerseynameid")
      },
      nationalityName,
      birthDateIso,
      age: birthDateIso ? this.ageFromIso(birthDateIso) : undefined,
      namesAvailable: Boolean(this.findNamesTable(project)),
      names,
      identityFields: this.makeFields(players, rowIndex, this.identityFields, project),
      sections: this.sections
        .map((section) => ({
          id: section.id,
          title: section.title,
          fields: this.makeFields(players, rowIndex, section.fields)
        }))
        .filter((section) => section.fields.length > 0)
    };
  }

  applyDraft(project: DbProject, draft: PlayerEditorDraft): { message: string; changedTables: string[] } {
    const players = this.findPlayersTable(project);
    if (!players) {
      throw new Error("players table was not found.");
    }

    const row = players.rows[draft.rowIndex];
    if (!row) {
      throw new Error("Selected player row no longer exists.");
    }

    for (const field of [...draft.identityFields, ...draft.sections.flatMap((section) => section.fields)]) {
      if (!field.readonly) {
        this.write(players, draft.rowIndex, field.column, field.value);
      }
    }

    const changedTables = new Set<string>();
    players.changed = true;
    changedTables.add(players.name);

    const namesTable = this.findNamesTable(project);
    if (namesTable) {
      const nameRowIndex = this.findOrCreateNameRow(namesTable, draft.playerId);
      this.write(namesTable, nameRowIndex, "firstname", draft.names.firstname);
      this.write(namesTable, nameRowIndex, "surname", draft.names.surname);
      this.write(namesTable, nameRowIndex, "commonname", draft.names.commonname);
      this.write(namesTable, nameRowIndex, "playerjerseyname", draft.names.playerjerseyname);
      namesTable.changed = true;
      changedTables.add(namesTable.name);

      this.writeIfPresent(players, draft.rowIndex, "iscustomized", "1");
      this.writeIfPresent(players, draft.rowIndex, "usercaneditname", "1");
    }

    return {
      message: `${this.displayName(draft.names, draft.playerId)} updated in ${[...changedTables].join(" + ")}`,
      changedTables: [...changedTables]
    };
  }

  private findTable(project: DbProject | undefined, name: string): DataTable | undefined {
    return project?.tables.find((table) => table.name.toLowerCase() === name);
  }

  private columnIndex(table: DataTable, column: string): number {
    return table.columns.findIndex((candidate) => candidate.toLowerCase() === column.toLowerCase());
  }

  private read(table: DataTable, rowIndex: number, column: string): string {
    const columnIndex = this.columnIndex(table, column);
    if (columnIndex < 0) {
      return "";
    }
    return table.rows[rowIndex]?.[columnIndex] ?? "";
  }

  private write(table: DataTable, rowIndex: number, column: string, value: string): void {
    const columnIndex = this.columnIndex(table, column);
    if (columnIndex < 0) {
      return;
    }
    const row = table.rows[rowIndex];
    if (!row) {
      return;
    }
    while (row.length < table.columns.length) {
      row.push("");
    }
    row[columnIndex] = value;
  }

  private writeIfPresent(table: DataTable, rowIndex: number, column: string, value: string): void {
    if (this.columnIndex(table, column) >= 0) {
      this.write(table, rowIndex, column, value);
    }
  }

  private resolveFieldRelation(project: DbProject | undefined, column: string, value: string): string | undefined {
    if (!project) {
      return undefined;
    }
    if (column.toLowerCase() === "nationality") {
      return this.resolveNation(project, value) || undefined;
    }
    return undefined;
  }

  private resolveNation(project: DbProject, nationId: string): string {
    if (!nationId) {
      return "";
    }
    const nations = this.findTable(project, "nations");
    if (!nations) {
      return "";
    }
    const nationIdColumn = this.columnIndex(nations, "nationid");
    const nameColumn = this.columnIndex(nations, "nationname");
    const isoColumn = this.columnIndex(nations, "isocountrycode");
    if (nationIdColumn < 0) {
      return "";
    }
    const row = nations.rows.find((candidate) => candidate[nationIdColumn] === nationId);
    if (!row) {
      return "";
    }
    const name = nameColumn >= 0 ? row[nameColumn]?.trim() : "";
    const iso = isoColumn >= 0 ? row[isoColumn]?.trim() : "";
    return [name, iso ? `(${iso})` : ""].filter(Boolean).join(" ");
  }

  private makeFields(
    table: DataTable,
    rowIndex: number,
    definitions: FieldDefinition[],
    project?: DbProject
  ): PlayerEditorFieldDraft[] {
    return definitions
      .filter((definition) => this.columnIndex(table, definition.column) >= 0)
      .map((definition) => ({
        column: definition.column,
        label: definition.label,
        value: this.read(table, rowIndex, definition.column),
        inputType: definition.inputType ?? "number",
        readonly: definition.readonly,
        min: definition.min,
        max: definition.max,
        relation: this.resolveFieldRelation(project, definition.column, this.read(table, rowIndex, definition.column))
      }));
  }

  private resolveNames(project: DbProject, players: DataTable, rowIndex: number, playerId: string): PlayerResolvedNames {
    const namesTable = this.findNamesTable(project);
    const nameRowIndex = namesTable ? this.findRowByPlayerId(namesTable, playerId) : -1;
    const editedNames = this.readNames(namesTable, nameRowIndex);
    if (this.hasAnyName(editedNames)) {
      return {
        ...editedNames,
        source: "editedplayernames"
      };
    }

    const firstname = this.resolveNameId(project, this.read(players, rowIndex, "firstnameid"));
    const surname = this.resolveNameId(project, this.read(players, rowIndex, "lastnameid"));
    const commonname = this.resolveNameId(project, this.read(players, rowIndex, "commonnameid"));
    const playerjerseyname = this.resolveNameId(project, this.read(players, rowIndex, "playerjerseynameid"));
    const resolvedNames = {
      firstname: firstname.value,
      surname: surname.value,
      commonname: commonname.value,
      playerjerseyname: playerjerseyname.value
    };

    if (this.hasAnyName(resolvedNames)) {
      return {
        ...resolvedNames,
        source: this.pickNameSource([firstname, surname, commonname, playerjerseyname])
      };
    }

    const hasCompressedNames = [firstname, surname, commonname, playerjerseyname].some((name) => name.source === "compressed");
    return {
      firstname: "",
      surname: "",
      commonname: "",
      playerjerseyname: "",
      source: hasCompressedNames ? "compressed" : "empty"
    };
  }

  private resolveNameId(project: DbProject, nameId: string): NameResolution {
    if (!nameId || nameId === "0" || nameId === "-1") {
      return { value: "", source: "empty" };
    }

    const dcName = this.lookupName(project, "dcplayernames", nameId);
    if (dcName) {
      return { value: dcName, source: "dcplayernames" };
    }

    const standardName = this.lookupName(project, "playernames", nameId);
    if (standardName) {
      return { value: standardName, source: "playernames" };
    }

    const compressedToken = this.lookupCompressedNameToken(project, nameId);
    if (compressedToken) {
      return { value: "", source: "compressed" };
    }

    return { value: "", source: "empty" };
  }

  private lookupName(project: DbProject, tableName: string, nameId: string): string {
    const table = this.findTable(project, tableName);
    if (!table) {
      return "";
    }
    const nameIdColumn = this.columnIndex(table, "nameid");
    const nameColumn = this.columnIndex(table, "name");
    if (nameIdColumn < 0 || nameColumn < 0) {
      return "";
    }
    const row = table.rows.find((candidate) => candidate[nameIdColumn] === nameId);
    const value = row?.[nameColumn]?.trim() ?? "";
    return this.isReadableName(value) ? value : "";
  }

  private lookupCompressedNameToken(project: DbProject, nameId: string): string {
    const table = this.findTable(project, "playernames");
    if (!table) {
      return "";
    }
    const nameIdColumn = this.columnIndex(table, "nameid");
    const nameColumn = this.columnIndex(table, "name");
    if (nameIdColumn < 0 || nameColumn < 0) {
      return "";
    }
    const row = table.rows.find((candidate) => candidate[nameIdColumn] === nameId);
    return row?.[nameColumn]?.trim() ?? "";
  }

  private pickNameSource(names: NameResolution[]): PlayerResolvedNames["source"] {
    if (names.some((name) => name.source === "dcplayernames")) {
      return "dcplayernames";
    }
    if (names.some((name) => name.source === "playernames")) {
      return "playernames";
    }
    if (names.some((name) => name.source === "compressed")) {
      return "compressed";
    }
    return "empty";
  }

  private isReadableName(value: string): boolean {
    return Boolean(value && /[^\d\s.-]/.test(value));
  }

  private readNames(table: DataTable | undefined, rowIndex: number): PlayerEditorNameDraft {
    if (!table || rowIndex < 0) {
      return {
        firstname: "",
        surname: "",
        commonname: "",
        playerjerseyname: ""
      };
    }

    return {
      firstname: this.read(table, rowIndex, "firstname"),
      surname: this.read(table, rowIndex, "surname"),
      commonname: this.read(table, rowIndex, "commonname"),
      playerjerseyname: this.read(table, rowIndex, "playerjerseyname")
    };
  }

  private findRowByPlayerId(table: DataTable, playerId: string): number {
    const playerIdColumn = this.columnIndex(table, "playerid");
    if (playerIdColumn < 0) {
      return -1;
    }
    return table.rows.findIndex((row) => row[playerIdColumn] === playerId);
  }

  private findOrCreateNameRow(table: DataTable, playerId: string): number {
    const existing = this.findRowByPlayerId(table, playerId);
    if (existing >= 0) {
      return existing;
    }

    const row = table.columns.map((column) => column.toLowerCase() === "playerid" ? playerId : "");
    table.rows.push(row);
    return table.rows.length - 1;
  }

  private displayName(names: PlayerEditorNameDraft, playerId: string): string {
    const commonName = names.commonname.trim();
    if (commonName) {
      return commonName;
    }
    const fullName = [names.firstname, names.surname].map((part) => part.trim()).filter(Boolean).join(" ");
    return fullName || `Player ${playerId}`;
  }

  private hasAnyName(names: PlayerEditorNameDraft): boolean {
    return Boolean(names.firstname.trim() || names.surname.trim() || names.commonname.trim() || names.playerjerseyname.trim());
  }

  private decodeFifaDate(value: string): string | undefined {
    const days = Number(value);
    if (!Number.isFinite(days) || days <= 0) {
      return undefined;
    }
    const date = new Date(Date.UTC(1601, 0, 1) + days * 24 * 60 * 60 * 1000);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10);
  }

  private ageFromIso(value: string): number {
    const birthDate = new Date(`${value}T00:00:00Z`);
    const today = new Date();
    let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
    const monthDelta = today.getUTCMonth() - birthDate.getUTCMonth();
    if (monthDelta < 0 || (monthDelta === 0 && today.getUTCDate() < birthDate.getUTCDate())) {
      age -= 1;
    }
    return age;
  }
}
