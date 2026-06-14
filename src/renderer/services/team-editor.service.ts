import { Injectable } from "@angular/core";
import type { DataTable, DbProject, FieldDescriptor } from "../../shared/types";

export interface TeamEditorFieldDraft {
  column: string;
  label: string;
  value: string;
  inputType: "number" | "text";
  readonly?: boolean;
  min?: number;
  max?: number;
}

export interface TeamEditorSectionDraft {
  id: string;
  title: string;
  fields: TeamEditorFieldDraft[];
}

export interface TeamEditorDraft {
  teamId: string;
  rowIndex: number;
  displayName: string;
  overall?: string;
  attack?: string;
  midfield?: string;
  defense?: string;
  sections: TeamEditorSectionDraft[];
}

export interface TeamSearchResult {
  rowIndex: number;
  teamId: string;
  displayName: string;
  overall?: string;
  attack?: string;
  midfield?: string;
  defense?: string;
  foundationYear?: string;
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

@Injectable({ providedIn: "root" })
export class TeamEditorService {
  private readonly sections: SectionDefinition[] = [
    {
      id: "identity",
      title: "Identity",
      fields: [
        { column: "teamid", label: "Team ID", readonly: true },
        { column: "teamname", label: "Team name", inputType: "text" },
        { column: "assetid", label: "Asset ID" },
        { column: "foundationyear", label: "Foundation year" },
        { column: "gender", label: "Gender" },
        { column: "cityid", label: "City ID" },
        { column: "rivalteam", label: "Rival team" },
        { column: "teamstadiumcapacity", label: "Stadium capacity" }
      ]
    },
    {
      id: "ratings",
      title: "Ratings",
      fields: [
        { column: "overallrating", label: "Overall", min: 0, max: 99, readonly: true },
        { column: "matchdayoverallrating", label: "Matchday overall", min: 0, max: 99, readonly: true },
        { column: "attackrating", label: "Attack", min: 0, max: 99 },
        { column: "midfieldrating", label: "Midfield", min: 0, max: 99 },
        { column: "defenserating", label: "Defense", min: 0, max: 99 },
        { column: "matchdayattackrating", label: "Matchday attack", min: 0, max: 99 },
        { column: "matchdaymidfieldrating", label: "Matchday midfield", min: 0, max: 99 },
        { column: "matchdaydefenserating", label: "Matchday defense", min: 0, max: 99 }
      ]
    },
    {
      id: "club",
      title: "Club",
      fields: [
        { column: "domesticprestige", label: "Domestic prestige" },
        { column: "internationalprestige", label: "International prestige" },
        { column: "popularity", label: "Popularity" },
        { column: "clubworth", label: "Club worth" },
        { column: "youthdevelopment", label: "Youth development" },
        { column: "profitability", label: "Profitability" },
        { column: "form", label: "Form" },
        { column: "leaguetitles", label: "League titles" },
        { column: "domesticcups", label: "Domestic cups" },
        { column: "uefa_cl_wins", label: "UEFA CL wins" },
        { column: "uefa_el_wins", label: "UEFA EL wins" },
        { column: "uefa_uecl_wins", label: "UEFA UECL wins" }
      ]
    },
    {
      id: "tactics",
      title: "Tactics",
      fields: [
        { column: "buildupplay", label: "Build up play" },
        { column: "defensivedepth", label: "Defensive depth" },
        { column: "opponentweakthreshold", label: "Opponent weak threshold" },
        { column: "opponentstrongthreshold", label: "Opponent strong threshold" },
        { column: "trait1vweak", label: "Trait weak" },
        { column: "trait1vequal", label: "Trait equal" },
        { column: "trait1vstrong", label: "Trait strong" },
        { column: "personalityid", label: "Personality" }
      ]
    },
    {
      id: "staff",
      title: "Set Pieces",
      fields: [
        { column: "captainid", label: "Captain" },
        { column: "penaltytakerid", label: "Penalty taker" },
        { column: "freekicktakerid", label: "Free kick taker" },
        { column: "leftfreekicktakerid", label: "Left free kick" },
        { column: "rightfreekicktakerid", label: "Right free kick" },
        { column: "leftcornerkicktakerid", label: "Left corner" },
        { column: "rightcornerkicktakerid", label: "Right corner" },
        { column: "longkicktakerid", label: "Long kick taker" }
      ]
    },
    {
      id: "visuals",
      title: "Visuals",
      fields: [
        { column: "teamcolor1r", label: "Color 1 R" },
        { column: "teamcolor1g", label: "Color 1 G" },
        { column: "teamcolor1b", label: "Color 1 B" },
        { column: "teamcolor2r", label: "Color 2 R" },
        { column: "teamcolor2g", label: "Color 2 G" },
        { column: "teamcolor2b", label: "Color 2 B" },
        { column: "teamcolor3r", label: "Color 3 R" },
        { column: "teamcolor3g", label: "Color 3 G" },
        { column: "teamcolor3b", label: "Color 3 B" },
        { column: "jerseytype", label: "Jersey type" },
        { column: "ballid", label: "Ball ID" },
        { column: "pitchcolor", label: "Pitch color" },
        { column: "pitchwear", label: "Pitch wear" }
      ]
    },
    {
      id: "stadium",
      title: "Stadium",
      fields: [
        { column: "trainingstadium", label: "Training stadium" },
        { column: "playsurfacetype", label: "Surface type" },
        { column: "stadiummowpattern_code", label: "Mow pattern" },
        { column: "stadiumgoalnetstyle", label: "Goal net style" },
        { column: "stadiumgoalnetpattern", label: "Goal net pattern" },
        { column: "hasstandingcrowd", label: "Standing crowd" },
        { column: "hassubstitutionboard", label: "Substitution board" },
        { column: "hastifo", label: "Tifo" },
        { column: "isbannerenabled", label: "Banner enabled" }
      ]
    }
  ];

  findTeamsTable(project?: DbProject): DataTable | undefined {
    return this.findTable(project, "teams");
  }

  invalidateTable(_table?: DataTable): void {
    // Reserved for future team lookup caches.
  }

  invalidateProject(_project?: DbProject): void {
    // Reserved for future team lookup caches.
  }

  findTeams(project: DbProject | undefined, query: string, limit = 60): TeamSearchResult[] {
    const teams = this.findTeamsTable(project);
    if (!teams) {
      return [];
    }

    const normalizedQuery = this.normalizeSearch(query.trim());
    const results: TeamSearchResult[] = [];
    for (let rowIndex = 0; rowIndex < teams.rows.length; rowIndex += 1) {
      const summary = this.createTeamSummary(teams, rowIndex);
      if (!summary) {
        continue;
      }
      if (normalizedQuery && !this.teamMatchesQuery(summary, normalizedQuery)) {
        continue;
      }
      results.push(summary);
      if (results.length >= limit) {
        break;
      }
    }
    return results;
  }

  createDraft(project: DbProject, rowIndex: number): TeamEditorDraft | undefined {
    const teams = this.findTeamsTable(project);
    if (!teams || !teams.rows[rowIndex]) {
      return undefined;
    }

    const teamId = this.read(teams, rowIndex, "teamid");
    const displayName = this.displayName(teams, rowIndex, teamId);

    return {
      teamId,
      rowIndex,
      displayName,
      overall: this.read(teams, rowIndex, "overallrating"),
      attack: this.read(teams, rowIndex, "attackrating"),
      midfield: this.read(teams, rowIndex, "midfieldrating"),
      defense: this.read(teams, rowIndex, "defenserating"),
      sections: this.sections
        .map((section) => ({
          id: section.id,
          title: section.title,
          fields: this.makeFields(teams, rowIndex, section.fields)
        }))
        .filter((section) => section.fields.length > 0)
    };
  }

  applyDraft(project: DbProject, draft: TeamEditorDraft): { message: string; changedTables: string[] } {
    const teams = this.findTeamsTable(project);
    if (!teams) {
      throw new Error("teams table was not found.");
    }
    if (!teams.rows[draft.rowIndex]) {
      throw new Error("Selected team row no longer exists.");
    }

    for (const field of draft.sections.flatMap((section) => section.fields)) {
      if (!field.readonly) {
        this.write(teams, draft.rowIndex, field.column, this.normalizeFieldForWrite(field));
      }
    }

    teams.changed = true;
    return {
      message: `${this.displayName(teams, draft.rowIndex, draft.teamId)} updated in ${teams.name}`,
      changedTables: [teams.name]
    };
  }

  private createTeamSummary(teams: DataTable, rowIndex: number): TeamSearchResult | undefined {
    if (!teams.rows[rowIndex]) {
      return undefined;
    }

    const teamId = this.read(teams, rowIndex, "teamid");
    return {
      rowIndex,
      teamId,
      displayName: this.displayName(teams, rowIndex, teamId),
      overall: this.read(teams, rowIndex, "overallrating"),
      attack: this.read(teams, rowIndex, "attackrating"),
      midfield: this.read(teams, rowIndex, "midfieldrating"),
      defense: this.read(teams, rowIndex, "defenserating"),
      foundationYear: this.read(teams, rowIndex, "foundationyear")
    };
  }

  private teamMatchesQuery(team: TeamSearchResult, normalizedQuery: string): boolean {
    return [
      team.displayName,
      team.teamId,
      team.foundationYear ?? ""
    ].some((value) => this.normalizeSearch(value).includes(normalizedQuery));
  }

  private makeFields(table: DataTable, rowIndex: number, definitions: FieldDefinition[]): TeamEditorFieldDraft[] {
    return definitions
      .filter((definition) => this.columnIndex(table, definition.column) >= 0)
      .map((definition) => {
        const field = this.fieldForColumn(table, definition.column);
        const range = this.numericRangeForField(field);
        return {
          column: definition.column,
          label: definition.label,
          value: this.read(table, rowIndex, definition.column),
          inputType: definition.inputType ?? this.inputTypeForField(field),
          readonly: definition.readonly,
          min: definition.min ?? range.min,
          max: definition.max ?? range.max
        };
      });
  }

  private normalizeFieldForWrite(field: TeamEditorFieldDraft): string {
    if (field.inputType === "number") {
      return this.validateNumericField(field);
    }
    return field.value;
  }

  private validateNumericField(field: TeamEditorFieldDraft): string {
    const raw = field.value.trim();
    if (!/^-?\d+$/.test(raw)) {
      throw new Error(`${field.label}: expected an integer value.`);
    }

    const numeric = Number(raw);
    if (!Number.isSafeInteger(numeric)) {
      throw new Error(`${field.label}: value is outside the safe integer range.`);
    }
    if (field.min !== undefined && numeric < field.min) {
      throw new Error(`${field.label}: value must be at least ${field.min}.`);
    }
    if (field.max !== undefined && numeric > field.max) {
      throw new Error(`${field.label}: value must be at most ${field.max}.`);
    }
    return raw;
  }

  private displayName(table: DataTable, rowIndex: number, teamId: string): string {
    return this.read(table, rowIndex, "teamname").trim() || `Team ${teamId}`;
  }

  private findTable(project: DbProject | undefined, name: string): DataTable | undefined {
    return project?.tables.find((table) => table.name.toLowerCase() === name);
  }

  private columnIndex(table: DataTable, column: string): number {
    return table.columns.findIndex((candidate) => candidate.toLowerCase() === column.toLowerCase());
  }

  private fieldForColumn(table: DataTable, column: string): FieldDescriptor | undefined {
    const index = this.columnIndex(table, column);
    return index >= 0 ? table.fields[index] : undefined;
  }

  private read(table: DataTable, rowIndex: number, column: string): string {
    const index = this.columnIndex(table, column);
    if (index < 0) {
      return "";
    }
    return table.rows[rowIndex]?.[index] ?? "";
  }

  private write(table: DataTable, rowIndex: number, column: string, value: string): void {
    const index = this.columnIndex(table, column);
    if (index < 0) {
      return;
    }
    const row = table.rows[rowIndex];
    if (!row) {
      return;
    }
    while (row.length < table.columns.length) {
      row.push("");
    }
    row[index] = value;
  }

  private inputTypeForField(field: FieldDescriptor | undefined): "number" | "text" {
    return field?.kind === "string" ? "text" : "number";
  }

  private numericRangeForField(field: FieldDescriptor | undefined): { min?: number; max?: number } {
    if (!field || field.kind === "string" || field.kind === "float" || field.rangeHigh < field.rangeLow) {
      return {};
    }
    return {
      min: Math.trunc(field.rangeLow),
      max: Math.trunc(field.rangeHigh)
    };
  }

  private normalizeSearch(value: string): string {
    return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }
}
