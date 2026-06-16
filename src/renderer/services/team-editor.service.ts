import { Injectable } from "@angular/core";
import type { DataTable, DbProject, FieldDescriptor } from "../../shared/types";
import type { SearchListOption } from "../components/search-list/search-list.component";
import { LocalizationService } from "./localization.service";
import type { LocalizationFieldDraft } from "./localization.service";
import { NationService } from "./nation.service";
import { TransferService } from "./transfer.service";
import type { TeamPlayerLinkDraft } from "./transfer.service";

export interface TeamEditorFieldDraft {
  column: string;
  label: string;
  value: string;
  inputType: "number" | "text" | "player";
  readonly?: boolean;
  min?: number;
  max?: number;
  isColorChannel?: boolean;
}

export interface TeamColorGroupDraft {
  id: string;
  label: string;
  redField: TeamEditorFieldDraft;
  greenField: TeamEditorFieldDraft;
  blueField: TeamEditorFieldDraft;
}

export interface TeamEditorSectionDraft {
  id: string;
  title: string;
  fields: TeamEditorFieldDraft[];
  colorGroups: TeamColorGroupDraft[];
}

export interface TeamNationLinkDraft {
  key: string;
  rowIndex: number;
  sourceRow?: string[];
  leagueId: string;
  nationId: string;
  nationName: string;
}

export interface TeamRivalDraft {
  key: string;
  rowIndex: number;
  sourceRow?: string[];
  selectedTeamColumn: "teamid1" | "teamid2";
  rivalTeamId: string;
  displayName: string;
  rivalType: string;
}

export interface TeamKitFieldDraft {
  column: string;
  label: string;
  value: string;
  inputType: "number" | "text";
  readonly?: boolean;
  min?: number;
  max?: number;
}

export interface TeamKitColorDraft {
  id: string;
  label: string;
  red: string;
  green: string;
  blue: string;
  redColumn: string;
  greenColumn: string;
  blueColumn: string;
}

export interface TeamKitDraft {
  key: string;
  rowIndex: number;
  sourceRow?: string[];
  required: boolean;
  baseValues: Record<string, string>;
  displayName: string;
  fields: TeamKitFieldDraft[];
  colorGroups: TeamKitColorDraft[];
}

export interface TeamStadiumOption extends SearchListOption {
  stadiumName: string;
  forcedHome: string;
  swapCrowdPlacement: string;
  baseValues: Record<string, string>;
}

export interface TeamStadiumLinkDraft {
  key: string;
  rowIndex: number;
  sourceRow?: string[];
  stadiumId: string;
  stadiumName: string;
  customName: string;
  forcedHome: string;
  swapCrowdPlacement: string;
  baseValues: Record<string, string>;
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
  playerLinks: TeamPlayerLinkDraft[];
  playerOptions: SearchListOption[];
  setPiecePlayerOptions: SearchListOption[];
  playerToAdd: string;
  nationLinks: TeamNationLinkDraft[];
  nationOptions: SearchListOption[];
  nationToAdd: string;
  defaultNationLeagueId: string;
  rivalLinks: TeamRivalDraft[];
  rivalTeamOptions: SearchListOption[];
  rivalToAdd: string;
  stadiumLink?: TeamStadiumLinkDraft;
  stadiumOptions: TeamStadiumOption[];
  stadiumToAssign: string;
  kitLinks: TeamKitDraft[];
  kitTypeToAdd: string;
  localizationFields: LocalizationFieldDraft[];
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

export interface TeamCreationResult {
  rowIndex: number;
  teamId: string;
  message: string;
}

interface FieldDefinition {
  column: string;
  label: string;
  inputType?: "number" | "text" | "player";
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
  constructor(
    private readonly nations: NationService,
    private readonly transfers: TransferService,
    private readonly localization: LocalizationService
  ) {}

  private readonly defaultKitTypes = [
    { type: "0", label: "Home" },
    { type: "1", label: "Away" },
    { type: "2", label: "Goalkeeper" }
  ];

  private readonly kitFieldDefinitions: { column: string; label: string }[] = [
    { column: "teamkitid", label: "Kit ID" },
    { column: "teamkittypetechid", label: "Kit type" },
    { column: "teamtechid", label: "Team tech ID" },
    { column: "powid", label: "POW ID" },
    { column: "year", label: "Year" },
    { column: "chestbadge", label: "Chest badge" },
    { column: "jerseyleftsleevebadge", label: "Left sleeve badge" },
    { column: "jerseyrightsleevebadge", label: "Right sleeve badge" },
    { column: "numberfonttype", label: "Number font" },
    { column: "jerseynamefonttype", label: "Name font" },
    { column: "shortsnumberfonttype", label: "Shorts number font" },
    { column: "captainarmband", label: "Captain armband" },
    { column: "armbandtype", label: "Armband type" },
    { column: "shortstyle", label: "Shorts style" },
    { column: "jerseyfit", label: "Jersey fit" },
    { column: "jerseyrestriction", label: "Jersey restriction" },
    { column: "islocked", label: "Locked" },
    { column: "isembargoed", label: "Embargoed" },
    { column: "hasadvertisingkit", label: "Advertising kit" },
    { column: "isinheritbasedetailmap", label: "Inherit detail map" },
    { column: "dlc", label: "DLC" }
  ];

  private readonly kitColorDefinitions = [
    { id: "team-primary", label: "Team primary", red: "teamcolorprimr", green: "teamcolorprimg", blue: "teamcolorprimb" },
    { id: "team-secondary", label: "Team secondary", red: "teamcolorsecr", green: "teamcolorsecg", blue: "teamcolorsecb" },
    { id: "team-tertiary", label: "Team tertiary", red: "teamcolortertr", green: "teamcolortertg", blue: "teamcolortertb" },
    { id: "number-primary", label: "Number primary", red: "jerseynumbercolorprimr", green: "jerseynumbercolorprimg", blue: "jerseynumbercolorprimb" },
    { id: "number-secondary", label: "Number secondary", red: "jerseynumbercolorsecr", green: "jerseynumbercolorsecg", blue: "jerseynumbercolorsecb" },
    { id: "name", label: "Jersey name", red: "jerseynamecolorr", green: "jerseynamecolorg", blue: "jerseynamecolorb" },
    { id: "name-outline", label: "Name outline", red: "jerseynameoutlinecolorr", green: "jerseynameoutlinecolorg", blue: "jerseynameoutlinecolorb" },
    { id: "shorts-number", label: "Shorts number", red: "shortsnumbercolorprimr", green: "shortsnumbercolorprimg", blue: "shortsnumbercolorprimb" }
  ];

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
        { column: "captainid", label: "Captain", inputType: "player" },
        { column: "penaltytakerid", label: "Penalty taker", inputType: "player" },
        { column: "freekicktakerid", label: "Free kick taker", inputType: "player" },
        { column: "leftfreekicktakerid", label: "Left free kick", inputType: "player" },
        { column: "rightfreekicktakerid", label: "Right free kick", inputType: "player" },
        { column: "leftcornerkicktakerid", label: "Left corner", inputType: "player" },
        { column: "rightcornerkicktakerid", label: "Right corner", inputType: "player" },
        { column: "longkicktakerid", label: "Long kick taker", inputType: "player" }
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
  ];

  findTeamsTable(project?: DbProject): DataTable | undefined {
    return this.findTable(project, "teams");
  }

  findRivalsTable(project?: DbProject): DataTable | undefined {
    return this.findTable(project, "rivals");
  }

  findTeamKitsTable(project?: DbProject): DataTable | undefined {
    return this.findTable(project, "teamkits");
  }

  findTeamNationLinksTable(project?: DbProject): DataTable | undefined {
    return this.findTable(project, "teamnationlinks");
  }

  findTeamStadiumLinksTable(project?: DbProject): DataTable | undefined {
    return this.findTable(project, "teamstadiumlinks");
  }

  findStadiumAssignmentsTable(project?: DbProject): DataTable | undefined {
    return this.findTable(project, "stadiumassignments");
  }

  invalidateTable(table?: DataTable): void {
    this.nations.invalidateTable(table);
  }

  invalidateProject(project?: DbProject): void {
    this.nations.invalidateProject(project);
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

  createTeam(project: DbProject | undefined): TeamCreationResult {
    if (!project) {
      throw new Error("Open a DB/XML pair before creating a team.");
    }

    const teams = this.findTeamsTable(project);
    if (!teams) {
      throw new Error("teams table was not found.");
    }

    const teamId = this.nextId(teams, "teamid");
    teams.rows.push(this.makeCreatedTeamRow(teams, teamId));
    teams.changed = true;
    this.invalidateTable(teams);

    return {
      rowIndex: teams.rows.length - 1,
      teamId,
      message: `Team ${teamId} created in teams`
    };
  }

  createDraft(project: DbProject, rowIndex: number): TeamEditorDraft | undefined {
    const teams = this.findTeamsTable(project);
    if (!teams || !teams.rows[rowIndex]) {
      return undefined;
    }

    const teamId = this.read(teams, rowIndex, "teamid");
    const displayName = this.displayName(teams, rowIndex, teamId);
    const teamOptions = this.teamOptions(project);
    const playerLinks = this.transfers.linkedPlayers(project, teamId);
    const kitLinks = this.withRequiredDefaultKits(project, teamId, this.linkedKits(project, teamId));
    const stadiumOptions = this.stadiumOptions(project);

    return {
      teamId,
      rowIndex,
      displayName,
      overall: this.read(teams, rowIndex, "overallrating"),
      attack: this.read(teams, rowIndex, "attackrating"),
      midfield: this.read(teams, rowIndex, "midfieldrating"),
      defense: this.read(teams, rowIndex, "defenserating"),
      sections: this.sections
        .map((section) => this.makeSectionDraft(teams, rowIndex, section))
        .filter((section) => section.fields.length > 0),
      playerLinks,
      playerOptions: this.transfers.playerOptions(project),
      setPiecePlayerOptions: this.setPiecePlayerOptions(playerLinks),
      playerToAdd: "",
      nationLinks: this.linkedNationLinks(project, teamId),
      nationOptions: this.nations.nationOptions(project),
      nationToAdd: "",
      defaultNationLeagueId: this.defaultNationLeagueId(project, teamId),
      rivalLinks: this.linkedRivals(project, teamId),
      rivalTeamOptions: teamOptions,
      rivalToAdd: "",
      stadiumLink: this.linkedStadium(project, teamId),
      stadiumOptions,
      stadiumToAssign: "",
      kitLinks,
      kitTypeToAdd: this.nextAvailableKitType(kitLinks),
      localizationFields: this.localization.teamFields(project, teamId, displayName)
    };
  }

  addPlayerToDraft(draft: TeamEditorDraft, playerId: string): string {
    const message = this.transfers.addPlayerToTeamDraft(draft, playerId);
    this.refreshSetPiecePlayerOptions(draft);
    return message;
  }

  removePlayerFromDraft(draft: TeamEditorDraft, playerId: string): void {
    draft.playerLinks = draft.playerLinks.filter((link) => link.playerId !== playerId);
    this.refreshSetPiecePlayerOptions(draft);
  }

  addNationToDraft(draft: TeamEditorDraft, nationId: string): string {
    if (!nationId) {
      throw new Error("Choose a country first.");
    }
    if (draft.nationLinks.some((link) => link.nationId === nationId)) {
      throw new Error("This country is already linked to the team.");
    }

    const nation = draft.nationOptions.find((option) => option.value === nationId);
    if (!nation) {
      throw new Error("Selected country was not found.");
    }

    draft.nationLinks.push({
      key: `new:${Date.now()}:${nationId}`,
      rowIndex: -1,
      leagueId: draft.defaultNationLeagueId,
      nationId,
      nationName: nation.label
    });
    draft.nationToAdd = "";
    return `${nation.label} linked to ${draft.displayName}`;
  }

  removeNationFromDraft(draft: TeamEditorDraft, key: string): void {
    draft.nationLinks = draft.nationLinks.filter((link) => link.key !== key);
  }

  addRivalToDraft(draft: TeamEditorDraft, rivalTeamId: string): string {
    if (!rivalTeamId) {
      throw new Error("Choose a rival team first.");
    }
    if (rivalTeamId === draft.teamId) {
      throw new Error("A team cannot be its own rival.");
    }
    if (draft.rivalLinks.some((link) => link.rivalTeamId === rivalTeamId)) {
      throw new Error("This rival is already linked to the team.");
    }

    const rival = draft.rivalTeamOptions.find((option) => option.value === rivalTeamId);
    if (!rival) {
      throw new Error("Selected rival team was not found.");
    }

    draft.rivalLinks.push({
      key: `new:${Date.now()}:${rivalTeamId}`,
      rowIndex: -1,
      selectedTeamColumn: "teamid1",
      rivalTeamId,
      displayName: rival.label,
      rivalType: "0"
    });
    draft.rivalToAdd = "";
    return `${rival.label} added as rival`;
  }

  removeRivalFromDraft(draft: TeamEditorDraft, key: string): void {
    draft.rivalLinks = draft.rivalLinks.filter((link) => link.key !== key);
  }

  assignStadiumToDraft(draft: TeamEditorDraft, stadiumId: string): string {
    if (!stadiumId) {
      throw new Error("Choose a stadium first.");
    }

    const option = draft.stadiumOptions.find((candidate) => candidate.value === stadiumId);
    if (!option) {
      throw new Error("Selected stadium was not found.");
    }

    const previousLink = draft.stadiumLink;
    const previousCustomName = previousLink?.customName.trim();
    draft.stadiumLink = {
      key: previousLink?.key ?? `new:${Date.now()}:${stadiumId}`,
      rowIndex: previousLink?.rowIndex ?? -1,
      sourceRow: previousLink?.sourceRow,
      stadiumId: option.value,
      stadiumName: option.stadiumName,
      customName: previousCustomName && previousCustomName !== previousLink?.stadiumName ? previousCustomName : option.stadiumName,
      forcedHome: option.forcedHome,
      swapCrowdPlacement: option.swapCrowdPlacement,
      baseValues: { ...option.baseValues }
    };
    draft.stadiumToAssign = "";
    return `${option.stadiumName} linked to ${draft.displayName}`;
  }

  addKitToDraft(project: DbProject, draft: TeamEditorDraft, kitType: string): string {
    const teamKits = this.findTeamKitsTable(project);
    if (!teamKits) {
      throw new Error("teamkits table was not found.");
    }

    const normalizedKitType = this.validateNumericValue(kitType, "Kit type");
    if (this.hasKitType(draft, normalizedKitType)) {
      throw new Error(`${this.kitTypeLabel(normalizedKitType)} kit already exists for this team.`);
    }

    const nextKitId = this.nextId(
      teamKits,
      "teamkitid",
      new Set(draft.kitLinks.map((kit) => Number(this.fieldValue(kit.fields, "teamkitid"))).filter(Number.isInteger))
    );
    const kit = this.createKitDraft(teamKits, draft.teamId, normalizedKitType, nextKitId);
    draft.kitLinks.push(kit);
    draft.kitTypeToAdd = this.nextAvailableKitType(draft.kitLinks);
    return `${kit.displayName} created for ${draft.displayName}`;
  }

  removeKitFromDraft(draft: TeamEditorDraft, key: string): string {
    const kit = draft.kitLinks.find((candidate) => candidate.key === key);
    if (kit?.required) {
      throw new Error(`${kit.displayName} is required by the game and cannot be removed.`);
    }
    draft.kitLinks = draft.kitLinks.filter((kit) => kit.key !== key);
    draft.kitTypeToAdd = this.nextAvailableKitType(draft.kitLinks);
    return "Kit removed";
  }

  applyDraft(project: DbProject, draft: TeamEditorDraft): { message: string; changedTables: string[] } {
    const teams = this.findTeamsTable(project);
    if (!teams) {
      throw new Error("teams table was not found.");
    }
    if (!teams.rows[draft.rowIndex]) {
      throw new Error("Selected team row no longer exists.");
    }

    const linkedPlayerIds = new Set(draft.playerLinks.map((player) => player.playerId));
    for (const field of draft.sections.flatMap((section) => section.fields)) {
      if (!field.readonly) {
        const value = this.normalizeFieldForWrite(field);
        if (field.inputType === "player" && !linkedPlayerIds.has(value)) {
          throw new Error(`${field.label}: choose a player linked to ${draft.displayName}.`);
        }
        this.write(teams, draft.rowIndex, field.column, value);
      }
    }

    const changedTables = new Set<string>();
    teams.changed = true;
    changedTables.add(teams.name);

    const rosterResult = this.transfers.applyTeamPlayers(project, draft.teamId, draft.playerLinks);
    if (rosterResult) {
      for (const tableName of rosterResult.changedTables) {
        changedTables.add(tableName);
      }
    }

    const nationResult = this.applyNationLinks(project, draft);
    if (nationResult) {
      changedTables.add(nationResult.name);
    }

    const rivalResult = this.applyRivals(project, draft);
    if (rivalResult) {
      changedTables.add(rivalResult.name);
    }
    if (this.syncMainRival(teams, draft)) {
      changedTables.add(teams.name);
    }

    for (const tableName of this.applyStadium(project, draft)) {
      changedTables.add(tableName);
    }

    const kitResult = this.applyKits(project, draft);
    if (kitResult) {
      changedTables.add(kitResult.name);
    }

    this.localization.refreshGeneratedFields(
      draft.localizationFields,
      this.localization.teamFields(project, draft.teamId, this.displayName(teams, draft.rowIndex, draft.teamId))
    );
    const localizationResult = this.localization.applyFields(project, draft.localizationFields);
    if (localizationResult) {
      for (const tableName of localizationResult.changedTables) {
        changedTables.add(tableName);
      }
    }

    return {
      message: `${this.displayName(teams, draft.rowIndex, draft.teamId)} updated in ${[...changedTables].join(" + ")}`,
      changedTables: [...changedTables]
    };
  }

  private applyNationLinks(project: DbProject, draft: TeamEditorDraft): DataTable | undefined {
    const links = this.findTeamNationLinksTable(project);
    if (!links) {
      if (draft.nationLinks.length > 0) {
        throw new Error("teamnationlinks table was not found.");
      }
      return undefined;
    }

    const teamIdColumn = this.columnIndex(links, "teamid");
    if (teamIdColumn < 0) {
      throw new Error("teamnationlinks needs teamid column.");
    }

    const keptRows = new Set(draft.nationLinks.map((link) => link.sourceRow).filter((row): row is string[] => Boolean(row)));
    links.rows = links.rows.filter((row) => row[teamIdColumn] !== draft.teamId || keptRows.has(row));

    for (const link of draft.nationLinks) {
      const leagueId = this.validateTableNumericValue(links, "leagueid", link.leagueId, "League ID");
      const teamId = this.validateTableNumericValue(links, "teamid", draft.teamId, "Team ID");
      const nationId = this.validateTableNumericValue(links, "nationid", link.nationId, "Country");
      const row = this.resolveDraftRow(links, link.sourceRow);
      const rowIndex = links.rows.indexOf(row);
      this.write(links, rowIndex, "leagueid", leagueId);
      this.write(links, rowIndex, "teamid", teamId);
      this.write(links, rowIndex, "nationid", nationId);
    }

    links.changed = true;
    return links;
  }

  private applyRivals(project: DbProject, draft: TeamEditorDraft): DataTable | undefined {
    const rivals = this.findRivalsTable(project);
    if (!rivals) {
      if (draft.rivalLinks.length > 0) {
        throw new Error("rivals table was not found.");
      }
      return undefined;
    }

    const teamId1Column = this.columnIndex(rivals, "teamid1");
    const teamId2Column = this.columnIndex(rivals, "teamid2");
    if (teamId1Column < 0 || teamId2Column < 0) {
      throw new Error("rivals needs teamid1 and teamid2 columns.");
    }

    const keptRows = new Set(draft.rivalLinks.map((link) => link.sourceRow).filter((row): row is string[] => Boolean(row)));
    linksLoop:
    for (let index = rivals.rows.length - 1; index >= 0; index -= 1) {
      const row = rivals.rows[index];
      const belongsToTeam = row[teamId1Column] === draft.teamId || row[teamId2Column] === draft.teamId;
      if (!belongsToTeam || keptRows.has(row)) {
        continue linksLoop;
      }
      rivals.rows.splice(index, 1);
    }

    for (const rival of draft.rivalLinks) {
      const row = this.resolveDraftRow(rivals, rival.sourceRow);
      const rowIndex = rivals.rows.indexOf(row);
      const rivalTeamId = this.validateNumericValue(rival.rivalTeamId, "Rival team");
      const rivalType = this.validateNumericValue(rival.rivalType, "Rival type");
      this.write(rivals, rowIndex, "rivaltype", rivalType);
      if (rival.selectedTeamColumn === "teamid2") {
        this.write(rivals, rowIndex, "teamid1", rivalTeamId);
        this.write(rivals, rowIndex, "teamid2", draft.teamId);
      } else {
        this.write(rivals, rowIndex, "teamid1", draft.teamId);
        this.write(rivals, rowIndex, "teamid2", rivalTeamId);
      }
    }

    rivals.changed = true;
    return rivals;
  }

  private syncMainRival(teams: DataTable, draft: TeamEditorDraft): boolean {
    if (this.columnIndex(teams, "rivalteam") < 0) {
      return false;
    }

    const mainRival = [...draft.rivalLinks]
      .filter((rival) => rival.rivalTeamId)
      .sort((left, right) =>
        this.numericValue(right.rivalType) - this.numericValue(left.rivalType) ||
        this.rivalOrder(left) - this.rivalOrder(right) ||
        left.displayName.localeCompare(right.displayName)
      )[0];

    const nextRivalTeamId = mainRival?.rivalTeamId ?? this.defaultValueForColumn(teams, "rivalteam");
    if (this.read(teams, draft.rowIndex, "rivalteam") === nextRivalTeamId) {
      return false;
    }

    this.write(
      teams,
      draft.rowIndex,
      "rivalteam",
      this.validateTableNumericValue(teams, "rivalteam", nextRivalTeamId, "Main rival")
    );
    teams.changed = true;
    return true;
  }

  private applyStadium(project: DbProject, draft: TeamEditorDraft): string[] {
    const changedTables = new Set<string>();
    const linkResult = this.applyStadiumLink(project, draft);
    if (linkResult) {
      changedTables.add(linkResult.name);
    }
    const assignmentResult = this.applyStadiumAssignment(project, draft);
    if (assignmentResult) {
      changedTables.add(assignmentResult.name);
    }
    return [...changedTables];
  }

  private applyStadiumLink(project: DbProject, draft: TeamEditorDraft): DataTable | undefined {
    const links = this.findTeamStadiumLinksTable(project);
    if (!links) {
      if (draft.stadiumLink) {
        throw new Error("teamstadiumlinks table was not found.");
      }
      return undefined;
    }

    const teamIdColumn = this.columnIndex(links, "teamid");
    const stadiumIdColumn = this.columnIndex(links, "stadiumid");
    if (teamIdColumn < 0 || stadiumIdColumn < 0) {
      throw new Error("teamstadiumlinks needs teamid and stadiumid columns.");
    }

    if (!draft.stadiumLink) {
      const originalLength = links.rows.length;
      links.rows = links.rows.filter((row) => row[teamIdColumn] !== draft.teamId);
      if (links.rows.length !== originalLength) {
        links.changed = true;
        return links;
      }
      return undefined;
    }

    const sourceRow = draft.stadiumLink.sourceRow && links.rows.includes(draft.stadiumLink.sourceRow)
      ? draft.stadiumLink.sourceRow
      : undefined;
    for (let index = links.rows.length - 1; index >= 0; index -= 1) {
      const row = links.rows[index];
      if (row[teamIdColumn] === draft.teamId && row !== sourceRow) {
        links.rows.splice(index, 1);
      }
    }

    const row = sourceRow ?? links.columns.map((column, columnIndex) => {
      const lowerColumn = column.toLowerCase();
      return draft.stadiumLink?.baseValues[lowerColumn] ?? this.defaultValueForField(links.fields[columnIndex]);
    });
    if (!sourceRow) {
      links.rows.push(row);
    }

    const rowIndex = links.rows.indexOf(row);
    links.columns.forEach((column, columnIndex) => {
      const value = draft.stadiumLink?.baseValues[column.toLowerCase()];
      if (value !== undefined) {
        row[columnIndex] = value;
      }
    });
    this.write(links, rowIndex, "stadiumname", draft.stadiumLink.stadiumName);
    this.write(links, rowIndex, "stadiumid", this.validateTableNumericValue(links, "stadiumid", draft.stadiumLink.stadiumId, "Stadium ID"));
    this.write(links, rowIndex, "teamid", this.validateTableNumericValue(links, "teamid", draft.teamId, "Team ID"));
    this.writeIfPresent(links, rowIndex, "forcedhome", this.validateTableNumericValue(links, "forcedhome", draft.stadiumLink.forcedHome, "Forced home"));
    this.writeIfPresent(
      links,
      rowIndex,
      "swapcrowdplacement",
      this.validateTableNumericValue(links, "swapcrowdplacement", draft.stadiumLink.swapCrowdPlacement, "Swap crowd placement")
    );
    draft.stadiumLink.sourceRow = row;
    draft.stadiumLink.rowIndex = rowIndex;
    links.changed = true;
    return links;
  }

  private applyStadiumAssignment(project: DbProject, draft: TeamEditorDraft): DataTable | undefined {
    const assignments = this.findStadiumAssignmentsTable(project);
    if (!assignments) {
      if (draft.stadiumLink?.customName.trim()) {
        throw new Error("stadiumassignments table was not found.");
      }
      return undefined;
    }

    const teamIdColumn = this.columnIndex(assignments, "teamid");
    const customNameColumn = this.columnIndex(assignments, "stadiumcustomname");
    if (teamIdColumn < 0 || customNameColumn < 0) {
      throw new Error("stadiumassignments needs teamid and stadiumcustomname columns.");
    }

    const existingRows = assignments.rows.filter((row) => row[teamIdColumn] === draft.teamId);
    const sourceRow = existingRows[0];
    for (let index = assignments.rows.length - 1; index >= 0; index -= 1) {
      const row = assignments.rows[index];
      if (row[teamIdColumn] === draft.teamId && row !== sourceRow) {
        assignments.rows.splice(index, 1);
      }
    }

    if (!draft.stadiumLink) {
      if (sourceRow) {
        assignments.rows = assignments.rows.filter((row) => row !== sourceRow);
        assignments.changed = true;
        return assignments;
      }
      return undefined;
    }

    const row = sourceRow ?? assignments.columns.map((_column, columnIndex) => this.defaultValueForField(assignments.fields[columnIndex]));
    if (!sourceRow) {
      assignments.rows.push(row);
    }
    const rowIndex = assignments.rows.indexOf(row);
    this.write(assignments, rowIndex, "teamid", this.validateTableNumericValue(assignments, "teamid", draft.teamId, "Team ID"));
    this.write(assignments, rowIndex, "stadiumcustomname", draft.stadiumLink.customName);
    assignments.changed = true;
    return assignments;
  }

  private applyKits(project: DbProject, draft: TeamEditorDraft): DataTable | undefined {
    const teamKits = this.findTeamKitsTable(project);
    if (!teamKits) {
      if (draft.kitLinks.length > 0) {
        throw new Error("teamkits table was not found.");
      }
      return undefined;
    }

    const teamTechIdColumn = this.columnIndex(teamKits, "teamtechid");
    if (teamTechIdColumn < 0) {
      throw new Error("teamkits needs teamtechid column.");
    }

    this.validateRequiredDefaultKits(draft);
    this.validateUniqueKitTypes(draft);

    const keptRows = new Set(draft.kitLinks.map((kit) => kit.sourceRow).filter((row): row is string[] => Boolean(row)));
    for (let index = teamKits.rows.length - 1; index >= 0; index -= 1) {
      const row = teamKits.rows[index];
      if (row[teamTechIdColumn] === draft.teamId && !keptRows.has(row)) {
        teamKits.rows.splice(index, 1);
      }
    }

    for (const kit of draft.kitLinks) {
      const row = this.resolveDraftRow(teamKits, kit.sourceRow);
      const rowIndex = teamKits.rows.indexOf(row);
      const nextRow = this.buildKitRow(teamKits, kit);
      teamKits.rows[rowIndex] = nextRow;
      kit.sourceRow = nextRow;
    }

    teamKits.changed = true;
    return teamKits;
  }

  private makeSectionDraft(table: DataTable, rowIndex: number, section: SectionDefinition): TeamEditorSectionDraft {
    const fields = this.makeFields(table, rowIndex, section.fields);
    return {
      id: section.id,
      title: section.title,
      fields,
      colorGroups: this.makeTeamColorGroups(section.id, fields)
    };
  }

  private makeTeamColorGroups(sectionId: string, fields: TeamEditorFieldDraft[]): TeamColorGroupDraft[] {
    if (sectionId !== "visuals") {
      return [];
    }

    return [
      this.makeTeamColorGroup(fields, "team-color-1", "Team color 1", "teamcolor1r", "teamcolor1g", "teamcolor1b"),
      this.makeTeamColorGroup(fields, "team-color-2", "Team color 2", "teamcolor2r", "teamcolor2g", "teamcolor2b"),
      this.makeTeamColorGroup(fields, "team-color-3", "Team color 3", "teamcolor3r", "teamcolor3g", "teamcolor3b")
    ].filter((group): group is TeamColorGroupDraft => Boolean(group));
  }

  private makeTeamColorGroup(
    fields: TeamEditorFieldDraft[],
    id: string,
    label: string,
    redColumn: string,
    greenColumn: string,
    blueColumn: string
  ): TeamColorGroupDraft | undefined {
    const redField = fields.find((field) => field.column.toLowerCase() === redColumn);
    const greenField = fields.find((field) => field.column.toLowerCase() === greenColumn);
    const blueField = fields.find((field) => field.column.toLowerCase() === blueColumn);
    if (!redField || !greenField || !blueField) {
      return undefined;
    }
    redField.isColorChannel = true;
    greenField.isColorChannel = true;
    blueField.isColorChannel = true;
    return { id, label, redField, greenField, blueField };
  }

  private linkedNationLinks(project: DbProject, teamId: string): TeamNationLinkDraft[] {
    const links = this.findTeamNationLinksTable(project);
    if (!links) {
      return [];
    }

    const teamIdColumn = this.columnIndex(links, "teamid");
    const nationIdColumn = this.columnIndex(links, "nationid");
    if (teamIdColumn < 0 || nationIdColumn < 0) {
      return [];
    }

    return links.rows
      .map((row, rowIndex) => ({ row, rowIndex }))
      .filter(({ row }) => row[teamIdColumn] === teamId)
      .map(({ row, rowIndex }) => {
        const nationId = row[nationIdColumn] ?? "";
        return {
          key: `existing:${rowIndex}`,
          rowIndex,
          sourceRow: row,
          leagueId: this.read(links, rowIndex, "leagueid"),
          nationId,
          nationName: this.nations.resolveNation(project, nationId)
        };
      });
  }

  private linkedRivals(project: DbProject, teamId: string): TeamRivalDraft[] {
    const rivals = this.findRivalsTable(project);
    if (!rivals) {
      return [];
    }

    const teamId1Column = this.columnIndex(rivals, "teamid1");
    const teamId2Column = this.columnIndex(rivals, "teamid2");
    if (teamId1Column < 0 || teamId2Column < 0) {
      return [];
    }

    return rivals.rows
      .map((row, rowIndex) => ({ row, rowIndex }))
      .filter(({ row }) => row[teamId1Column] === teamId || row[teamId2Column] === teamId)
      .map(({ row, rowIndex }) => {
        const selectedTeamColumn: "teamid1" | "teamid2" = row[teamId2Column] === teamId ? "teamid2" : "teamid1";
        const rivalTeamId = selectedTeamColumn === "teamid2" ? row[teamId1Column] ?? "" : row[teamId2Column] ?? "";
        return {
          key: `existing:${rowIndex}`,
          rowIndex,
          sourceRow: row,
          selectedTeamColumn,
          rivalTeamId,
          displayName: this.resolveTeamName(project, rivalTeamId),
          rivalType: this.read(rivals, rowIndex, "rivaltype")
        };
      })
      .sort((left, right) => left.displayName.localeCompare(right.displayName));
  }

  private linkedStadium(project: DbProject, teamId: string): TeamStadiumLinkDraft | undefined {
    const links = this.findTeamStadiumLinksTable(project);
    if (!links) {
      return undefined;
    }

    const teamIdColumn = this.columnIndex(links, "teamid");
    if (teamIdColumn < 0) {
      return undefined;
    }

    const rowIndex = links.rows.findIndex((row) => row[teamIdColumn] === teamId);
    if (rowIndex < 0) {
      return undefined;
    }

    const row = links.rows[rowIndex];
    const stadiumId = this.read(links, rowIndex, "stadiumid");
    const stadiumName = this.read(links, rowIndex, "stadiumname") || `Stadium ${stadiumId}`;
    return {
      key: `existing:${rowIndex}`,
      rowIndex,
      sourceRow: row,
      stadiumId,
      stadiumName,
      customName: this.stadiumAssignmentName(project, teamId) || stadiumName,
      forcedHome: this.read(links, rowIndex, "forcedhome") || "0",
      swapCrowdPlacement: this.read(links, rowIndex, "swapcrowdplacement") || "0",
      baseValues: this.valuesFromRow(links, row)
    };
  }

  private stadiumAssignmentName(project: DbProject, teamId: string): string {
    const assignments = this.findStadiumAssignmentsTable(project);
    if (!assignments) {
      return "";
    }

    const teamIdColumn = this.columnIndex(assignments, "teamid");
    const customNameColumn = this.columnIndex(assignments, "stadiumcustomname");
    if (teamIdColumn < 0 || customNameColumn < 0) {
      return "";
    }

    const row = assignments.rows.find((candidate) => candidate[teamIdColumn] === teamId);
    return row?.[customNameColumn]?.trim() ?? "";
  }

  private stadiumOptions(project: DbProject): TeamStadiumOption[] {
    const links = this.findTeamStadiumLinksTable(project);
    if (!links) {
      return [];
    }

    const stadiumIdColumn = this.columnIndex(links, "stadiumid");
    const stadiumNameColumn = this.columnIndex(links, "stadiumname");
    if (stadiumIdColumn < 0) {
      return [];
    }

    const optionsById = new Map<string, TeamStadiumOption>();
    for (const row of links.rows) {
      const stadiumId = row[stadiumIdColumn]?.trim() ?? "";
      if (!stadiumId || optionsById.has(stadiumId)) {
        continue;
      }

      const stadiumName = stadiumNameColumn >= 0 ? row[stadiumNameColumn]?.trim() ?? "" : "";
      optionsById.set(stadiumId, {
        value: stadiumId,
        label: stadiumName || `Stadium ${stadiumId}`,
        meta: `ID ${stadiumId}`,
        stadiumName: stadiumName || `Stadium ${stadiumId}`,
        forcedHome: this.valueFromRow(links, row, "forcedhome") || "0",
        swapCrowdPlacement: this.valueFromRow(links, row, "swapcrowdplacement") || "0",
        baseValues: this.valuesFromRow(links, row)
      });
    }

    return [...optionsById.values()].sort((left, right) => left.label.localeCompare(right.label));
  }

  private linkedKits(project: DbProject, teamId: string): TeamKitDraft[] {
    const teamKits = this.findTeamKitsTable(project);
    if (!teamKits) {
      return [];
    }

    const teamTechIdColumn = this.columnIndex(teamKits, "teamtechid");
    if (teamTechIdColumn < 0) {
      return [];
    }

    return teamKits.rows
      .map((row, rowIndex) => ({ row, rowIndex }))
      .filter(({ row }) => row[teamTechIdColumn] === teamId)
      .map(({ row, rowIndex }) => this.makeKitDraft(teamKits, row, rowIndex))
      .sort((left, right) => Number(this.fieldValue(left.fields, "teamkittypetechid")) - Number(this.fieldValue(right.fields, "teamkittypetechid")));
  }

  private withRequiredDefaultKits(project: DbProject, teamId: string, kits: TeamKitDraft[]): TeamKitDraft[] {
    const teamKits = this.findTeamKitsTable(project);
    if (!teamKits) {
      return kits;
    }

    const usedKitIds = new Set(kits.map((kit) => Number(this.fieldValue(kit.fields, "teamkitid"))).filter(Number.isInteger));
    const existingTypes = new Set(kits.map((kit) => this.fieldValue(kit.fields, "teamkittypetechid")));
    for (const kitType of this.defaultKitTypes) {
      if (existingTypes.has(kitType.type)) {
        continue;
      }

      const kitId = this.nextId(teamKits, "teamkitid", usedKitIds);
      usedKitIds.add(Number(kitId));
      const kit = this.createKitDraft(teamKits, teamId, kitType.type, kitId);
      kits.push(kit);
      existingTypes.add(kitType.type);
    }

    return kits.sort((left, right) => Number(this.fieldValue(left.fields, "teamkittypetechid")) - Number(this.fieldValue(right.fields, "teamkittypetechid")));
  }

  private createKitDraft(teamKits: DataTable, teamId: string, kitType: string, teamKitId: string): TeamKitDraft {
    const template = this.findKitTemplateRow(teamKits, kitType) ?? teamKits.rows[0] ?? [];
    const baseValues = this.valuesFromRow(teamKits, template);
    baseValues["teamkitid"] = teamKitId;
    baseValues["teamkittypetechid"] = kitType;
    baseValues["teamtechid"] = teamId;
    baseValues["powid"] = "-1";
    baseValues["year"] = "0";
    baseValues["islocked"] = "0";
    baseValues["isembargoed"] = "0";
    baseValues["hasadvertisingkit"] = "0";
    baseValues["isinheritbasedetailmap"] = "0";

    return this.makeKitDraft(teamKits, this.rowFromValues(teamKits, baseValues), -1, `new:${Date.now()}:${teamKitId}`);
  }

  private makeKitDraft(teamKits: DataTable, row: string[], rowIndex: number, key = `existing:${rowIndex}`): TeamKitDraft {
    const baseValues = this.valuesFromRow(teamKits, row);
    const kitType = baseValues["teamkittypetechid"] ?? "";
    const required = this.isRequiredDefaultKitType(kitType);
    const fields = this.kitFieldDefinitions
      .filter((definition) => this.columnIndex(teamKits, definition.column) >= 0)
      .map((definition) => {
        const field = this.fieldForColumn(teamKits, definition.column);
        const range = this.numericRangeForField(field);
        return {
          column: definition.column,
          label: definition.label,
          value: baseValues[definition.column.toLowerCase()] ?? "",
          inputType: this.inputTypeForField(field),
          readonly: required && definition.column === "teamkittypetechid",
          min: range.min,
          max: range.max
        };
      });

    return {
      key,
      rowIndex,
      sourceRow: rowIndex >= 0 ? row : undefined,
      required,
      baseValues,
      displayName: this.kitDisplayName(fields),
      fields,
      colorGroups: this.kitColorDefinitions
        .filter((definition) => this.hasColumns(teamKits, definition.red, definition.green, definition.blue))
        .map((definition) => ({
          id: definition.id,
          label: definition.label,
          red: baseValues[definition.red] ?? "0",
          green: baseValues[definition.green] ?? "0",
          blue: baseValues[definition.blue] ?? "0",
          redColumn: definition.red,
          greenColumn: definition.green,
          blueColumn: definition.blue
        }))
    };
  }

  private buildKitRow(teamKits: DataTable, kit: TeamKitDraft): string[] {
    const values = { ...kit.baseValues };
    for (const field of kit.fields) {
      values[field.column.toLowerCase()] = this.normalizeKitFieldForWrite(field);
    }
    for (const color of kit.colorGroups) {
      values[color.redColumn] = this.validateRgbChannel(color.red, color.label, "R");
      values[color.greenColumn] = this.validateRgbChannel(color.green, color.label, "G");
      values[color.blueColumn] = this.validateRgbChannel(color.blue, color.label, "B");
    }

    return teamKits.columns.map((column, columnIndex) => {
      const lowerColumn = column.toLowerCase();
      const fallback = kit.baseValues[lowerColumn] ?? this.defaultValueForField(teamKits.fields[columnIndex]);
      return this.clampFieldValue(teamKits, lowerColumn, values[lowerColumn] ?? fallback, fallback);
    });
  }

  private normalizeKitFieldForWrite(field: TeamKitFieldDraft): string {
    if (field.inputType === "text") {
      return field.value;
    }
    const raw = this.validateNumericValue(field.value, field.label);
    const numeric = Number(raw);
    if (field.min !== undefined && numeric < field.min) {
      throw new Error(`${field.label}: value must be at least ${field.min}.`);
    }
    if (field.max !== undefined && numeric > field.max) {
      throw new Error(`${field.label}: value must be at most ${field.max}.`);
    }
    return raw;
  }

  private validateRgbChannel(value: string, label: string, channel: string): string {
    const raw = this.validateNumericValue(value, `${label} ${channel}`);
    const numeric = Number(raw);
    if (numeric < 0 || numeric > 255) {
      throw new Error(`${label} ${channel}: value must be between 0 and 255.`);
    }
    return raw;
  }

  private resolveDraftRow(table: DataTable, sourceRow: string[] | undefined): string[] {
    if (sourceRow && table.rows.includes(sourceRow)) {
      return sourceRow;
    }
    const row = table.columns.map((_column, columnIndex) => this.defaultValueForField(table.fields[columnIndex]));
    table.rows.push(row);
    return row;
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

  private teamOptions(project: DbProject): SearchListOption[] {
    const teams = this.findTeamsTable(project);
    if (!teams) {
      return [];
    }

    const teamIdColumn = this.columnIndex(teams, "teamid");
    const nameColumn = this.columnIndex(teams, "teamname");
    if (teamIdColumn < 0) {
      return [];
    }

    return teams.rows
      .map((row) => {
        const teamId = row[teamIdColumn]?.trim() ?? "";
        const name = nameColumn >= 0 ? row[nameColumn]?.trim() ?? "" : "";
        return {
          value: teamId,
          label: name || `Team ${teamId}`,
          meta: teamId
        };
      })
      .filter((option) => option.value)
      .sort((left, right) => left.label.localeCompare(right.label));
  }

  private resolveTeamName(project: DbProject, teamId: string): string {
    const teams = this.findTeamsTable(project);
    if (!teams) {
      return `Team ${teamId}`;
    }

    const teamIdColumn = this.columnIndex(teams, "teamid");
    const nameColumn = this.columnIndex(teams, "teamname");
    if (teamIdColumn < 0 || nameColumn < 0) {
      return `Team ${teamId}`;
    }

    const row = teams.rows.find((candidate) => candidate[teamIdColumn] === teamId);
    return row?.[nameColumn]?.trim() || `Team ${teamId}`;
  }

  private defaultNationLeagueId(project: DbProject, teamId: string): string {
    const nationLinks = this.findTeamNationLinksTable(project);
    const nationTeamIdColumn = nationLinks ? this.columnIndex(nationLinks, "teamid") : -1;
    const nationLeagueIdColumn = nationLinks ? this.columnIndex(nationLinks, "leagueid") : -1;
    const existingNationLink = nationLinks?.rows.find((row) => row[nationTeamIdColumn] === teamId);
    if (nationLinks && existingNationLink && nationLeagueIdColumn >= 0) {
      const leagueId = existingNationLink[nationLeagueIdColumn] ?? "";
      if (this.isValueInColumnRange(nationLinks, "leagueid", leagueId)) {
        return leagueId;
      }
    }

    const leagueLinks = this.findTable(project, "leagueteamlinks");
    const leagueTeamIdColumn = leagueLinks ? this.columnIndex(leagueLinks, "teamid") : -1;
    const leagueIdColumn = leagueLinks ? this.columnIndex(leagueLinks, "leagueid") : -1;
    const existingLeagueLink = leagueLinks?.rows.find((row) => row[leagueTeamIdColumn] === teamId);
    if (existingLeagueLink && leagueIdColumn >= 0) {
      const leagueId = existingLeagueLink[leagueIdColumn] ?? "";
      if (!nationLinks || this.isValueInColumnRange(nationLinks, "leagueid", leagueId)) {
        return leagueId;
      }
    }

    return nationLinks ? this.defaultValueForColumn(nationLinks, "leagueid") : "0";
  }

  private fieldValue(fields: Array<{ column: string; value: string }>, column: string): string {
    return fields.find((field) => field.column.toLowerCase() === column.toLowerCase())?.value ?? "";
  }

  private kitDisplayName(fields: TeamKitFieldDraft[]): string {
    const kitId = this.fieldValue(fields, "teamkitid");
    const kitType = this.fieldValue(fields, "teamkittypetechid");
    return `${this.kitTypeLabel(kitType)} kit ${kitId || "(new)"}`;
  }

  private kitTypeLabel(kitType: string): string {
    return this.defaultKitTypes.find((type) => type.type === kitType)?.label ?? `Type ${kitType}`;
  }

  private isRequiredDefaultKitType(kitType: string): boolean {
    return this.defaultKitTypes.some((type) => type.type === kitType);
  }

  private hasKitType(draft: TeamEditorDraft, kitType: string): boolean {
    return draft.kitLinks.some((kit) => this.fieldValue(kit.fields, "teamkittypetechid") === kitType);
  }

  private nextAvailableKitType(kits: TeamKitDraft[]): string {
    const usedTypes = new Set(kits.map((kit) => Number(this.fieldValue(kit.fields, "teamkittypetechid"))).filter(Number.isInteger));
    for (let candidate = 0; candidate < 1000; candidate += 1) {
      if (!usedTypes.has(candidate)) {
        return String(candidate);
      }
    }
    return String(usedTypes.size);
  }

  private validateUniqueKitTypes(draft: TeamEditorDraft): void {
    const seenTypes = new Set<string>();
    for (const kit of draft.kitLinks) {
      const kitType = this.validateNumericValue(this.fieldValue(kit.fields, "teamkittypetechid"), "Kit type");
      if (seenTypes.has(kitType)) {
        throw new Error(`${this.kitTypeLabel(kitType)} kit is duplicated. Each team can only have one kit per type.`);
      }
      seenTypes.add(kitType);
    }
  }

  private validateRequiredDefaultKits(draft: TeamEditorDraft): void {
    const existingTypes = new Set(draft.kitLinks.map((kit) => this.fieldValue(kit.fields, "teamkittypetechid")));
    const missing = this.defaultKitTypes.filter((kitType) => !existingTypes.has(kitType.type));
    if (missing.length > 0) {
      throw new Error(`Missing required kit(s): ${missing.map((kitType) => kitType.label).join(", ")}.`);
    }
  }

  private findKitTemplateRow(teamKits: DataTable, kitType: string): string[] | undefined {
    const typeColumn = this.columnIndex(teamKits, "teamkittypetechid");
    if (typeColumn < 0) {
      return undefined;
    }
    return teamKits.rows.find((row) => row[typeColumn] === kitType);
  }

  private valuesFromRow(table: DataTable, row: string[]): Record<string, string> {
    const values: Record<string, string> = {};
    table.columns.forEach((column, columnIndex) => {
      values[column.toLowerCase()] = row[columnIndex] ?? this.defaultValueForField(table.fields[columnIndex]);
    });
    return values;
  }

  private valueFromRow(table: DataTable, row: string[], column: string): string {
    const index = this.columnIndex(table, column);
    return index >= 0 ? row[index] ?? "" : "";
  }

  private rowFromValues(table: DataTable, values: Record<string, string>): string[] {
    return table.columns.map((column, columnIndex) => values[column.toLowerCase()] ?? this.defaultValueForField(table.fields[columnIndex]));
  }

  private hasColumns(table: DataTable, ...columns: string[]): boolean {
    return columns.every((column) => this.columnIndex(table, column) >= 0);
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

  private refreshSetPiecePlayerOptions(draft: TeamEditorDraft): void {
    draft.setPiecePlayerOptions = this.setPiecePlayerOptions(draft.playerLinks);
  }

  private setPiecePlayerOptions(playerLinks: TeamPlayerLinkDraft[]): SearchListOption[] {
    return playerLinks.map((player) => ({
      value: player.playerId,
      label: player.displayName,
      meta: player.jerseyNumber ? `#${player.jerseyNumber} / ID ${player.playerId}` : `ID ${player.playerId}`
    }));
  }

  private normalizeFieldForWrite(field: TeamEditorFieldDraft): string {
    if (field.inputType === "number" || field.inputType === "player") {
      return this.validateNumericField(field);
    }
    return field.value;
  }

  private validateNumericValue(value: string, label: string): string {
    const raw = value.trim();
    if (!/^-?\d+$/.test(raw)) {
      throw new Error(`${label}: expected an integer value.`);
    }
    const numeric = Number(raw);
    if (!Number.isSafeInteger(numeric)) {
      throw new Error(`${label}: value is outside the safe integer range.`);
    }
    return raw;
  }

  private validateTableNumericValue(table: DataTable, column: string, value: string, label: string): string {
    const raw = this.validateNumericValue(value, label);
    const field = this.fieldForColumn(table, column);
    if (!field || field.rangeHigh < field.rangeLow) {
      return raw;
    }

    const numeric = Number(raw);
    if (numeric < field.rangeLow) {
      throw new Error(`${label}: value must be at least ${field.rangeLow}.`);
    }
    if (numeric > field.rangeHigh) {
      throw new Error(`${label}: value must be at most ${field.rangeHigh}.`);
    }
    return raw;
  }

  private validateNumericField(field: TeamEditorFieldDraft): string {
    const raw = this.validateNumericValue(field.value, field.label);
    const numeric = Number(raw);
    if (field.min !== undefined && numeric < field.min) {
      throw new Error(`${field.label}: value must be at least ${field.min}.`);
    }
    if (field.max !== undefined && numeric > field.max) {
      throw new Error(`${field.label}: value must be at most ${field.max}.`);
    }
    return raw;
  }

  private makeCreatedTeamRow(teams: DataTable, teamId: string): string[] {
    const defaults = new Map<string, string>([
      ["teamid", teamId],
      ["teamname", "New Team"],
      ["overallrating", "60"],
      ["matchdayoverallrating", "60"],
      ["attackrating", "60"],
      ["midfieldrating", "60"],
      ["defenserating", "60"],
      ["matchdayattackrating", "60"],
      ["matchdaymidfieldrating", "60"],
      ["matchdaydefenserating", "60"],
      ["foundationyear", String(new Date().getFullYear())]
    ]);

    return teams.columns.map((column, columnIndex) => {
      const lowerColumn = column.toLowerCase();
      const fallback = this.defaultValueForField(teams.fields[columnIndex]);
      return this.clampFieldValue(teams, lowerColumn, defaults.get(lowerColumn) ?? fallback, fallback);
    });
  }

  private nextId(table: DataTable, column: string, additionalUsed = new Set<number>()): string {
    const columnIndex = this.columnIndex(table, column);
    if (columnIndex < 0) {
      throw new Error(`${table.name}.${column} column was not found.`);
    }

    const field = this.fieldForColumn(table, column);
    const used = new Set<number>(additionalUsed);
    let maxId = 0;
    for (const row of table.rows) {
      const value = Number(row[columnIndex]);
      if (Number.isInteger(value) && value > 0) {
        used.add(value);
        maxId = Math.max(maxId, value);
      }
    }

    const minId = Math.max(1, Math.trunc(field?.rangeLow ?? 1));
    const maxAllowed = field && field.rangeHigh >= field.rangeLow ? Math.trunc(field.rangeHigh) : Number.MAX_SAFE_INTEGER;
    const next = Math.max(maxId + 1, minId);
    if (next <= maxAllowed && !used.has(next)) {
      return String(next);
    }

    const scanLimit = Math.min(maxAllowed, minId + Math.max(table.rows.length * 2, 100000));
    for (let candidate = minId; candidate <= scanLimit; candidate += 1) {
      if (!used.has(candidate)) {
        return String(candidate);
      }
    }

    throw new Error(`No free ${column} was found in ${table.name}.`);
  }

  private defaultValueForField(field: FieldDescriptor | undefined): string {
    if (!field || field.kind === "string" || field.kind === "shortCompressedString" || field.kind === "longCompressedString" || field.kind === "unknown") {
      return "";
    }
    if (field.rangeHigh >= field.rangeLow) {
      if (field.rangeLow <= 0 && field.rangeHigh >= 0) {
        return "0";
      }
      return String(Math.trunc(field.rangeLow));
    }
    return "0";
  }

  private defaultValueForColumn(table: DataTable, column: string): string {
    const field = this.fieldForColumn(table, column);
    const fallback = this.defaultValueForField(field);
    return fallback || "0";
  }

  private isValueInColumnRange(table: DataTable, column: string, value: string): boolean {
    const raw = value.trim();
    if (!/^-?\d+$/.test(raw)) {
      return false;
    }

    const numeric = Number(raw);
    if (!Number.isSafeInteger(numeric)) {
      return false;
    }

    const field = this.fieldForColumn(table, column);
    return !field || field.rangeHigh < field.rangeLow || (numeric >= field.rangeLow && numeric <= field.rangeHigh);
  }

  private clampFieldValue(table: DataTable, column: string, value: string, fallback: string): string {
    const field = this.fieldForColumn(table, column);
    if (!field || field.kind === "string" || field.kind === "shortCompressedString" || field.kind === "longCompressedString" || field.kind === "unknown") {
      return value;
    }

    const numeric = Number(value);
    const fallbackNumeric = Number(fallback);
    if (!Number.isFinite(numeric)) {
      return Number.isFinite(fallbackNumeric) ? fallback : this.defaultValueForField(field);
    }
    if (field.rangeHigh < field.rangeLow) {
      return String(Math.trunc(numeric));
    }
    const clamped = Math.min(Math.max(Math.trunc(numeric), Math.trunc(field.rangeLow)), Math.trunc(field.rangeHigh));
    return String(clamped);
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

  private writeIfPresent(table: DataTable, rowIndex: number, column: string, value: string): void {
    if (this.columnIndex(table, column) >= 0) {
      this.write(table, rowIndex, column, value);
    }
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

  private numericValue(value: string): number {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  private rivalOrder(rival: TeamRivalDraft): number {
    return rival.rowIndex >= 0 ? rival.rowIndex : Number.MAX_SAFE_INTEGER;
  }

  private normalizeSearch(value: string): string {
    return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }
}
