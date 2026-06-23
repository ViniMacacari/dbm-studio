import { Injectable } from "@angular/core";
import type { DataTable, DbProject } from "../../shared/types";
import { positionIdToName } from "../../utils/position-mapper/position-mapper";
import { PlayerEditorService } from "./player-editor.service";
import type { TeamPlayerLinkDraft } from "./transfer.service";

export type TeamSheetSlotType = "starting" | "bench" | "reserve" | "other";

export interface TeamSheetSlot {
  slot: number;
  type: TeamSheetSlotType;
  playerId: string;
  playerName: string;
  positionId?: number;
  positionName?: string;
  preferredPositionId?: number;
  preferredPositionName?: string;
  offsetX?: number;
  offsetY?: number;
  roleId?: number;
  overall?: number;
}

export interface FormationLayout {
  positions: Record<number, number>;
  offsets: Record<number, { x: number; y: number }>;
  roles: Record<number, number | undefined>;
}

export interface FormationTemplate extends FormationLayout {
  formationId: string;
  relativeFormationId: string;
  formationName: string;
  formationFullNameId: string;
  formationAudioId?: string;
  optionalFields: Record<string, string>;
}

interface FormationPlayerInfo {
  playerId: string;
  playerName: string;
  preferredPositionId?: number;
  preferredPositionName?: string;
  overall?: number;
}

interface FormationSourceRows {
  teamsheet: number;
  mentality: number;
  teamData: number;
  teamFormation: number;
}

export interface TeamFormationEditorState {
  teamId: string;
  templates: FormationTemplate[];
  selectedFormationId: string;
  selectedFormation: FormationTemplate;
  startingXI: TeamSheetSlot[];
  bench: TeamSheetSlot[];
  reserves: TeamSheetSlot[];
  otherSquadPlayers: TeamSheetSlot[];
  captainId?: string;
  setPieceTakers: {
    penaltyTakerId?: string;
    freekickTakerId?: string;
    leftFreekickTakerId?: string;
    rightFreekickTakerId?: string;
    leftCornerKickTakerId?: string;
    rightCornerKickTakerId?: string;
    longKickTakerId?: string;
  };
  sheetPlayerIds: string[];
  mentalityPlayerIds: string[];
  mentalityLayout: FormationLayout;
  teamDataLayout: FormationLayout;
  teamFormationLayout: FormationLayout;
  allowedPlayerIds: string[];
  playerCatalog: Record<string, FormationPlayerInfo>;
  sourceRows: FormationSourceRows;
  dirty: boolean;
  formationChanged: boolean;
}

export interface FormationValidationResult {
  valid: boolean;
  errors: string[];
}

export interface FormationSaveResult {
  changedTables: string[];
}

const startingSlotCount = 11;
const totalTeamsheetSlots = 52;
const firstBenchSlot = 11;
const benchSlotCount = 9;
const lastBenchSlot = firstBenchSlot + benchSlotCount - 1;
const optionalFormationFields = ["defenders", "midfielders", "attackers", "offensiverating"];

@Injectable({ providedIn: "root" })
export class TeamFormationEditorService {
  constructor(private readonly players: PlayerEditorService) {}

  loadTeamFormation(
    project: DbProject,
    teamId: string,
    linkedPlayers: TeamPlayerLinkDraft[]
  ): TeamFormationEditorState | undefined {
    const teamsheets = this.findTable(project, "default_teamsheets");
    const mentalities = this.findTable(project, "default_mentalities");
    const teamData = this.findTable(project, "defaultteamdata");
    const formations = this.findTable(project, "formations");
    if (!teamsheets || !mentalities || !teamData || !formations) {
      return undefined;
    }

    const sourceRows: FormationSourceRows = {
      teamsheet: this.findTeamRow(teamsheets, teamId),
      mentality: this.findTeamRow(mentalities, teamId),
      teamData: this.findTeamRow(teamData, teamId),
      teamFormation: this.findTeamRow(formations, teamId)
    };
    if (Object.values(sourceRows).some((rowIndex) => rowIndex < 0)) {
      return undefined;
    }

    const templates = formations.rows
      .map((_row, rowIndex) => ({ rowIndex, teamId: this.read(formations, rowIndex, "teamid") }))
      .filter((entry) => entry.teamId === "-1")
      .map((entry) => this.readTemplate(formations, entry.rowIndex))
      .filter((template): template is FormationTemplate => Boolean(template))
      .sort((left, right) => left.formationName.localeCompare(right.formationName) || Number(left.formationId) - Number(right.formationId));
    if (templates.length === 0) {
      return undefined;
    }

    const relativeFormationId = this.read(formations, sourceRows.teamFormation, "relativeformationid");
    const formationFullNameId = this.read(formations, sourceRows.teamFormation, "formationfullnameid");
    const formationName = this.read(formations, sourceRows.teamFormation, "formationname");
    const selectedFormation = templates.find((template) => template.formationId === relativeFormationId)
      ?? templates.find((template) => template.relativeFormationId === relativeFormationId)
      ?? templates.find((template) => template.formationFullNameId === formationFullNameId && template.formationName === formationName)
      ?? templates[0];

    const state: TeamFormationEditorState = {
      teamId,
      templates,
      selectedFormationId: selectedFormation.formationId,
      selectedFormation,
      startingXI: [],
      bench: [],
      reserves: [],
      otherSquadPlayers: [],
      captainId: this.optionalPlayerId(this.read(teamsheets, sourceRows.teamsheet, "captainid")),
      setPieceTakers: {
        penaltyTakerId: this.optionalPlayerId(this.read(teamsheets, sourceRows.teamsheet, "penaltytakerid")),
        freekickTakerId: this.optionalPlayerId(this.read(teamsheets, sourceRows.teamsheet, "freekicktakerid")),
        leftFreekickTakerId: this.optionalPlayerId(this.read(teamsheets, sourceRows.teamsheet, "leftfreekicktakerid")),
        rightFreekickTakerId: this.optionalPlayerId(this.read(teamsheets, sourceRows.teamsheet, "rightfreekicktakerid")),
        leftCornerKickTakerId: this.optionalPlayerId(this.read(teamsheets, sourceRows.teamsheet, "leftcornerkicktakerid")),
        rightCornerKickTakerId: this.optionalPlayerId(this.read(teamsheets, sourceRows.teamsheet, "rightcornerkicktakerid")),
        longKickTakerId: this.optionalPlayerId(this.read(teamsheets, sourceRows.teamsheet, "longkicktakerid"))
      },
      sheetPlayerIds: Array.from({ length: totalTeamsheetSlots }, (_value, slot) =>
        this.normalizePlayerId(this.read(teamsheets, sourceRows.teamsheet, `playerid${slot}`))
      ),
      mentalityPlayerIds: Array.from({ length: startingSlotCount }, (_value, slot) =>
        this.normalizePlayerId(this.read(mentalities, sourceRows.mentality, `playerid${slot}`))
      ),
      mentalityLayout: this.readLayout(mentalities, sourceRows.mentality, true),
      teamDataLayout: this.readLayout(teamData, sourceRows.teamData, false),
      teamFormationLayout: this.readLayout(formations, sourceRows.teamFormation, true),
      allowedPlayerIds: [],
      playerCatalog: {},
      sourceRows,
      dirty: false,
      formationChanged: false
    };

    this.syncSquadPlayers(project, state, linkedPlayers);
    return state;
  }

  syncSquadPlayers(project: DbProject, state: TeamFormationEditorState, linkedPlayers: TeamPlayerLinkDraft[]): void {
    const playersTable = this.findTable(project, "players");
    const playerCatalog: Record<string, FormationPlayerInfo> = {};
    for (const link of linkedPlayers) {
      const summary = this.players.resolvePlayerSummaryById(project, link.playerId);
      const prefPos1 = playersTable && summary ? this.read(playersTable, summary.rowIndex, "preferredposition1") : undefined;
      const preferredStr = prefPos1 && prefPos1 !== "-1" ? prefPos1 : link.position;
      const preferredPositionId = this.optionalNumber(preferredStr);
      playerCatalog[link.playerId] = {
        playerId: link.playerId,
        playerName: link.displayName || summary?.displayName || `Player ${link.playerId}`,
        preferredPositionId,
        preferredPositionName: preferredPositionId === undefined ? undefined : positionIdToName(preferredPositionId),
        overall: this.optionalNumber(summary?.overall)
      };
    }
    state.allowedPlayerIds = Object.keys(playerCatalog);
    state.playerCatalog = playerCatalog;
    const allowedPlayerIds = new Set(state.allowedPlayerIds);
    let referencesChanged = false;
    state.sheetPlayerIds = state.sheetPlayerIds.map((playerId) => {
      if (playerId === "-1" || allowedPlayerIds.has(playerId)) {
        return playerId;
      }
      referencesChanged = true;
      return "-1";
    });
    const nextMentalityPlayerIds = state.sheetPlayerIds.slice(0, startingSlotCount);
    if (!this.stringArraysEqual(state.mentalityPlayerIds, nextMentalityPlayerIds)) {
      state.mentalityPlayerIds = nextMentalityPlayerIds;
      referencesChanged = true;
    }
    if (state.captainId && !allowedPlayerIds.has(state.captainId)) {
      state.captainId = undefined;
      referencesChanged = true;
    }
    for (const key of Object.keys(state.setPieceTakers) as Array<keyof TeamFormationEditorState["setPieceTakers"]>) {
      const playerId = state.setPieceTakers[key];
      if (playerId && !allowedPlayerIds.has(playerId)) {
        state.setPieceTakers[key] = undefined;
        referencesChanged = true;
      }
    }
    if (referencesChanged) {
      state.dirty = true;
    }
    this.rebuildSlots(state);
  }

  swapPlayers(state: TeamFormationEditorState, fromSlot: TeamSheetSlot, toSlot: TeamSheetSlot): TeamFormationEditorState {
    if (this.slotKey(fromSlot) === this.slotKey(toSlot)) {
      return state;
    }
    const fromPopulated = Boolean(fromSlot.playerId && fromSlot.playerId !== "-1");
    const toPopulated = Boolean(toSlot.playerId && toSlot.playerId !== "-1");
    if (!fromPopulated && !toPopulated) {
      throw new Error("Choose at least one populated player slot.");
    }

    if (fromSlot.slot >= 0 && toSlot.slot >= 0) {
      const playerId = state.sheetPlayerIds[fromSlot.slot];
      state.sheetPlayerIds[fromSlot.slot] = state.sheetPlayerIds[toSlot.slot];
      state.sheetPlayerIds[toSlot.slot] = playerId;
    } else if (fromSlot.slot < 0 && toSlot.slot >= 0) {
      state.sheetPlayerIds[toSlot.slot] = fromSlot.playerId;
    } else if (fromSlot.slot >= 0 && toSlot.slot < 0) {
      state.sheetPlayerIds[fromSlot.slot] = toSlot.playerId;
    } else {
      return state;
    }

    state.mentalityPlayerIds = state.sheetPlayerIds.slice(0, startingSlotCount);
    state.dirty = true;
    this.rebuildSlots(state);
    return state;
  }

  changeFormation(state: TeamFormationEditorState, formationTemplateId: string): TeamFormationEditorState {
    const template = state.templates.find((candidate) => candidate.formationId === formationTemplateId);
    if (!template) {
      throw new Error(`Formation template ${formationTemplateId} was not found.`);
    }

    state.selectedFormationId = template.formationId;
    state.selectedFormation = template;
    state.mentalityLayout = this.cloneLayout(template);
    state.teamDataLayout = this.cloneLayout(template);
    state.teamFormationLayout = this.cloneLayout(template);
    state.mentalityPlayerIds = state.sheetPlayerIds.slice(0, startingSlotCount);
    state.formationChanged = true;
    state.dirty = true;
    this.rebuildSlots(state);
    return state;
  }

  validateTeamFormationState(state: TeamFormationEditorState): FormationValidationResult {
    const errors: string[] = [];
    const startingIds = state.sheetPlayerIds.slice(0, startingSlotCount);
    const populatedIds = state.sheetPlayerIds.filter((playerId) => playerId && playerId !== "-1");
    if (new Set(populatedIds).size !== populatedIds.length) {
      errors.push("A player cannot appear more than once in teamsheet slots 0..51.");
    }

    const allowedPlayerIds = new Set(state.allowedPlayerIds);
    const invalidPlayers = [...new Set(populatedIds.filter((playerId) => !allowedPlayerIds.has(playerId)))];
    if (invalidPlayers.length > 0) {
      errors.push(`Players not linked to team ${state.teamId}: ${invalidPlayers.join(", ")}.`);
    }

    if (!this.stringArraysEqual(state.mentalityPlayerIds, startingIds)) {
      errors.push("Active mentality players must match the teamsheet starting XI.");
    }

    if (state.formationChanged) {
      if (!this.layoutsEqual(state.mentalityLayout, state.selectedFormation)) {
        errors.push("Active mentality layout does not match the selected formation.");
      }
      if (!this.layoutsEqual(state.teamDataLayout, state.selectedFormation)) {
        errors.push("Default team layout does not match the selected formation.");
      }
      if (!this.layoutsEqual(state.teamFormationLayout, state.selectedFormation)) {
        errors.push("Team-specific formation layout does not match the selected formation.");
      }
    }

    return { valid: errors.length === 0, errors };
  }

  saveTeamFormation(project: DbProject, state: TeamFormationEditorState): FormationSaveResult {
    const validation = this.validateTeamFormationState(state);
    if (!validation.valid) {
      throw new Error(validation.errors.join(" "));
    }

    const teamsheets = this.requiredTable(project, "default_teamsheets");
    const mentalities = this.requiredTable(project, "default_mentalities");
    const teamData = this.requiredTable(project, "defaultteamdata");
    const formations = this.requiredTable(project, "formations");
    const rows = {
      teamsheet: this.requiredTeamRow(teamsheets, state.teamId),
      mentality: this.requiredTeamRow(mentalities, state.teamId),
      teamData: this.requiredTeamRow(teamData, state.teamId),
      teamFormation: this.requiredTeamRow(formations, state.teamId)
    };
    if (this.read(formations, rows.teamFormation, "teamid") === "-1") {
      throw new Error("Refusing to update a global formation template.");
    }

    const snapshots = [
      this.snapshot(teamsheets, rows.teamsheet),
      this.snapshot(mentalities, rows.mentality),
      this.snapshot(teamData, rows.teamData),
      this.snapshot(formations, rows.teamFormation)
    ];
    const changedTables = new Set<string>();

    try {
      for (let slot = 0; slot < totalTeamsheetSlots; slot += 1) {
        this.writeIfPresent(teamsheets, rows.teamsheet, `playerid${slot}`, state.sheetPlayerIds[slot] ?? "-1");
      }
      for (let slot = 0; slot < startingSlotCount; slot += 1) {
        this.writeRequired(mentalities, rows.mentality, `playerid${slot}`, state.sheetPlayerIds[slot]);
      }
      this.writeIfPresent(teamsheets, rows.teamsheet, "captainid", state.captainId ?? "-1");
      this.writeIfPresent(teamsheets, rows.teamsheet, "penaltytakerid", state.setPieceTakers.penaltyTakerId ?? "-1");
      this.writeIfPresent(teamsheets, rows.teamsheet, "freekicktakerid", state.setPieceTakers.freekickTakerId ?? "-1");
      this.writeIfPresent(teamsheets, rows.teamsheet, "leftfreekicktakerid", state.setPieceTakers.leftFreekickTakerId ?? "-1");
      this.writeIfPresent(teamsheets, rows.teamsheet, "rightfreekicktakerid", state.setPieceTakers.rightFreekickTakerId ?? "-1");
      this.writeIfPresent(teamsheets, rows.teamsheet, "leftcornerkicktakerid", state.setPieceTakers.leftCornerKickTakerId ?? "-1");
      this.writeIfPresent(teamsheets, rows.teamsheet, "rightcornerkicktakerid", state.setPieceTakers.rightCornerKickTakerId ?? "-1");
      this.writeIfPresent(teamsheets, rows.teamsheet, "longkicktakerid", state.setPieceTakers.longKickTakerId ?? "-1");
      teamsheets.changed = true;
      mentalities.changed = true;
      changedTables.add(teamsheets.name);
      changedTables.add(mentalities.name);

      if (state.formationChanged) {
        this.writeFormationLayout(formations, rows.teamFormation, state.selectedFormation, true);
        this.writeRequired(formations, rows.teamFormation, "relativeformationid", state.selectedFormation.relativeFormationId || state.selectedFormation.formationId);
        this.writeIfPresent(formations, rows.teamFormation, "formationname", state.selectedFormation.formationName);
        this.writeIfPresent(formations, rows.teamFormation, "formationfullnameid", state.selectedFormation.formationFullNameId);
        this.writeIfPresent(formations, rows.teamFormation, "formationaudioid", state.selectedFormation.formationAudioId ?? "");
        for (const column of optionalFormationFields) {
          this.writeIfPresent(formations, rows.teamFormation, column, state.selectedFormation.optionalFields[column] ?? "");
        }

        this.writeFormationLayout(teamData, rows.teamData, state.selectedFormation, false);
        this.writeIfPresent(teamData, rows.teamData, "formationfullnameid", state.selectedFormation.formationFullNameId);

        this.writeFormationLayout(mentalities, rows.mentality, state.selectedFormation, true);
        this.writeIfPresent(mentalities, rows.mentality, "formationfullnameid", state.selectedFormation.formationFullNameId);
        this.writeIfPresent(mentalities, rows.mentality, "formationaudioid", state.selectedFormation.formationAudioId ?? "");

        formations.changed = true;
        teamData.changed = true;
        changedTables.add(formations.name);
        changedTables.add(teamData.name);
      }

      this.validateWrittenRows(teamsheets, rows.teamsheet, mentalities, rows.mentality, teamData, rows.teamData, formations, rows.teamFormation, state);
    } catch (error) {
      for (const snapshot of snapshots) {
        snapshot.table.rows[snapshot.rowIndex] = snapshot.row;
        snapshot.table.changed = snapshot.changed;
      }
      throw error;
    }

    state.dirty = false;
    state.formationChanged = false;
    return { changedTables: [...changedTables] };
  }

  private validateWrittenRows(
    teamsheets: DataTable,
    teamsheetRow: number,
    mentalities: DataTable,
    mentalityRow: number,
    teamData: DataTable,
    teamDataRow: number,
    formations: DataTable,
    formationRow: number,
    state: TeamFormationEditorState
  ): void {
    for (let slot = 0; slot < startingSlotCount; slot += 1) {
      const sheetPlayer = this.read(teamsheets, teamsheetRow, `playerid${slot}`);
      const mentalityPlayer = this.read(mentalities, mentalityRow, `playerid${slot}`);
      if (sheetPlayer !== mentalityPlayer) {
        throw new Error(`Formation save verification failed for player slot ${slot}.`);
      }
    }
    if (!state.formationChanged) {
      return;
    }
    for (let slot = 0; slot < startingSlotCount; slot += 1) {
      for (const column of [`position${slot}`, `offset${slot}x`, `offset${slot}y`]) {
        const expected = this.templateValue(state.selectedFormation, column);
        if (this.hasColumn(teamData, column) && this.read(teamData, teamDataRow, column) !== expected) {
          throw new Error(`Default team data verification failed for ${column}.`);
        }
        if (this.hasColumn(mentalities, column) && this.read(mentalities, mentalityRow, column) !== expected) {
          throw new Error(`Mentality verification failed for ${column}.`);
        }
        if (this.hasColumn(formations, column) && this.read(formations, formationRow, column) !== expected) {
          throw new Error(`Team formation verification failed for ${column}.`);
        }
      }
      const roleColumn = `pos${slot}role`;
      if (this.hasColumn(mentalities, roleColumn) && this.read(mentalities, mentalityRow, roleColumn) !== this.templateValue(state.selectedFormation, roleColumn)) {
        throw new Error(`Mentality verification failed for ${roleColumn}.`);
      }
    }
  }

  private rebuildSlots(state: TeamFormationEditorState): void {
    state.startingXI = Array.from({ length: startingSlotCount }, (_value, slot) =>
      this.makeSlot(state, slot, "starting")
    );
    state.bench = [];
    state.reserves = [];
    for (let slot = firstBenchSlot; slot < totalTeamsheetSlots; slot += 1) {
      if (state.sheetPlayerIds[slot] === "-1") {
        continue;
      }
      const type: TeamSheetSlotType = slot <= lastBenchSlot ? "bench" : "reserve";
      (type === "bench" ? state.bench : state.reserves).push(this.makeSlot(state, slot, type));
    }

    const assignedPlayerIds = new Set(state.sheetPlayerIds.filter((playerId) => playerId !== "-1"));
    state.otherSquadPlayers = state.allowedPlayerIds
      .filter((playerId) => !assignedPlayerIds.has(playerId))
      .map((playerId) => this.makeOtherSlot(state, playerId))
      .sort((left, right) => left.playerName.localeCompare(right.playerName));
  }

  private makeSlot(state: TeamFormationEditorState, slot: number, type: TeamSheetSlotType): TeamSheetSlot {
    const playerId = state.sheetPlayerIds[slot] ?? "-1";
    const player = state.playerCatalog[playerId];
    const layoutPosition = type === "starting" ? state.mentalityLayout.positions[slot] : player?.preferredPositionId;
    return {
      slot,
      type,
      playerId,
      playerName: player?.playerName ?? (playerId === "-1" ? "Empty slot" : `Player ${playerId}`),
      positionId: layoutPosition,
      positionName: layoutPosition === undefined ? undefined : positionIdToName(layoutPosition),
      preferredPositionId: player?.preferredPositionId,
      preferredPositionName: player?.preferredPositionName,
      offsetX: type === "starting" ? state.mentalityLayout.offsets[slot]?.x : undefined,
      offsetY: type === "starting" ? state.mentalityLayout.offsets[slot]?.y : undefined,
      roleId: type === "starting" ? state.mentalityLayout.roles[slot] : undefined,
      overall: player?.overall
    };
  }

  private makeOtherSlot(state: TeamFormationEditorState, playerId: string): TeamSheetSlot {
    const player = state.playerCatalog[playerId];
    return {
      slot: -1,
      type: "other",
      playerId,
      playerName: player?.playerName ?? `Player ${playerId}`,
      positionId: player?.preferredPositionId,
      positionName: player?.preferredPositionName,
      preferredPositionId: player?.preferredPositionId,
      preferredPositionName: player?.preferredPositionName,
      overall: player?.overall
    };
  }

  private readTemplate(table: DataTable, rowIndex: number): FormationTemplate | undefined {
    const formationId = this.read(table, rowIndex, "formationid");
    const formationName = this.read(table, rowIndex, "formationname");
    if (!formationId || !formationName) {
      return undefined;
    }
    return {
      formationId,
      relativeFormationId: this.read(table, rowIndex, "relativeformationid") || formationId,
      formationName,
      formationFullNameId: this.read(table, rowIndex, "formationfullnameid"),
      formationAudioId: this.read(table, rowIndex, "formationaudioid") || undefined,
      ...this.readLayout(table, rowIndex, true),
      optionalFields: Object.fromEntries(optionalFormationFields.map((column) => [column, this.read(table, rowIndex, column)]))
    };
  }

  private readLayout(table: DataTable, rowIndex: number, includeRoles: boolean): FormationLayout {
    const positions: Record<number, number> = {};
    const offsets: Record<number, { x: number; y: number }> = {};
    const roles: Record<number, number | undefined> = {};
    for (let slot = 0; slot < startingSlotCount; slot += 1) {
      positions[slot] = this.numberOr(this.read(table, rowIndex, `position${slot}`), -1);
      offsets[slot] = {
        x: this.numberOr(this.read(table, rowIndex, `offset${slot}x`), 0.5),
        y: this.numberOr(this.read(table, rowIndex, `offset${slot}y`), 0.5)
      };
      roles[slot] = includeRoles ? this.optionalNumber(this.read(table, rowIndex, `pos${slot}role`)) : undefined;
    }
    return { positions, offsets, roles };
  }

  private cloneLayout(layout: FormationLayout): FormationLayout {
    return {
      positions: Object.fromEntries(Object.entries(layout.positions).map(([slot, position]) => [slot, position])),
      offsets: Object.fromEntries(Object.entries(layout.offsets).map(([slot, offset]) => [slot, { ...offset }])),
      roles: Object.fromEntries(Object.entries(layout.roles).map(([slot, role]) => [slot, role]))
    };
  }

  private writeFormationLayout(table: DataTable, rowIndex: number, template: FormationTemplate, includeRoles: boolean): void {
    for (let slot = 0; slot < startingSlotCount; slot += 1) {
      this.writeIfPresent(table, rowIndex, `position${slot}`, String(template.positions[slot]));
      this.writeIfPresent(table, rowIndex, `offset${slot}x`, String(template.offsets[slot].x));
      this.writeIfPresent(table, rowIndex, `offset${slot}y`, String(template.offsets[slot].y));
      if (includeRoles && template.roles[slot] !== undefined) {
        this.writeIfPresent(table, rowIndex, `pos${slot}role`, String(template.roles[slot]));
      }
    }
  }

  private templateValue(template: FormationTemplate, column: string): string {
    const positionMatch = /^position(\d+)$/.exec(column);
    if (positionMatch) {
      return String(template.positions[Number(positionMatch[1])]);
    }
    const offsetMatch = /^offset(\d+)([xy])$/.exec(column);
    if (offsetMatch) {
      const offset = template.offsets[Number(offsetMatch[1])];
      return String(offset[offsetMatch[2] as "x" | "y"]);
    }
    const roleMatch = /^pos(\d+)role$/.exec(column);
    if (roleMatch) {
      return String(template.roles[Number(roleMatch[1])]);
    }
    return "";
  }

  private layoutsEqual(left: FormationLayout, right: FormationLayout): boolean {
    for (let slot = 0; slot < startingSlotCount; slot += 1) {
      if (left.positions[slot] !== right.positions[slot]) {
        return false;
      }
      if (left.offsets[slot]?.x !== right.offsets[slot]?.x || left.offsets[slot]?.y !== right.offsets[slot]?.y) {
        return false;
      }
      if (right.roles[slot] !== undefined && left.roles[slot] !== right.roles[slot]) {
        return false;
      }
    }
    return true;
  }

  private stringArraysEqual(left: string[], right: string[]): boolean {
    return left.length === right.length && left.every((value, index) => value === right[index]);
  }

  private slotKey(slot: TeamSheetSlot): string {
    return slot.slot >= 0 ? `${slot.type}:${slot.slot}` : `${slot.type}:${slot.playerId}`;
  }

  private normalizePlayerId(value: string): string {
    const trimmed = value.trim();
    return trimmed && trimmed !== "0" ? trimmed : "-1";
  }

  private optionalPlayerId(value: string): string | undefined {
    const normalized = this.normalizePlayerId(value);
    return normalized === "-1" ? undefined : normalized;
  }

  private optionalNumber(value: string | undefined): number | undefined {
    if (value === undefined || value === null || value === "") {
      return undefined;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private numberOr(value: string, fallback: number): number {
    return this.optionalNumber(value) ?? fallback;
  }

  private snapshot(table: DataTable, rowIndex: number): { table: DataTable; rowIndex: number; row: string[]; changed: boolean | undefined } {
    return { table, rowIndex, row: table.rows[rowIndex].slice(), changed: table.changed };
  }

  private requiredTable(project: DbProject, name: string): DataTable {
    const table = this.findTable(project, name);
    if (!table) {
      throw new Error(`${name} table was not found.`);
    }
    return table;
  }

  private requiredTeamRow(table: DataTable, teamId: string): number {
    const rowIndex = this.findTeamRow(table, teamId);
    if (rowIndex < 0) {
      throw new Error(`${table.name} has no row for team ${teamId}.`);
    }
    return rowIndex;
  }

  private findTable(project: DbProject, name: string): DataTable | undefined {
    return project.tables.find((table) => table.name.toLowerCase() === name.toLowerCase());
  }

  private findTeamRow(table: DataTable, teamId: string): number {
    const teamIdColumn = this.columnIndex(table, "teamid");
    return teamIdColumn < 0 ? -1 : table.rows.findIndex((row) => row[teamIdColumn] === teamId);
  }

  private columnIndex(table: DataTable, column: string): number {
    return table.columns.findIndex((candidate) => candidate.toLowerCase() === column.toLowerCase());
  }

  private hasColumn(table: DataTable, column: string): boolean {
    return this.columnIndex(table, column) >= 0;
  }

  private read(table: DataTable, rowIndex: number, column: string): string {
    const columnIndex = this.columnIndex(table, column);
    return columnIndex < 0 ? "" : table.rows[rowIndex]?.[columnIndex] ?? "";
  }

  private writeRequired(table: DataTable, rowIndex: number, column: string, value: string): void {
    const columnIndex = this.columnIndex(table, column);
    if (columnIndex < 0) {
      throw new Error(`${table.name}.${column} was not found.`);
    }
    this.writeAt(table, rowIndex, columnIndex, value);
  }

  private writeIfPresent(table: DataTable, rowIndex: number, column: string, value: string): void {
    const columnIndex = this.columnIndex(table, column);
    if (columnIndex >= 0) {
      this.writeAt(table, rowIndex, columnIndex, value);
    }
  }

  private writeAt(table: DataTable, rowIndex: number, columnIndex: number, value: string): void {
    const row = table.rows[rowIndex];
    if (!row) {
      throw new Error(`${table.name} row ${rowIndex} was not found.`);
    }
    while (row.length < table.columns.length) {
      row.push("");
    }
    row[columnIndex] = value;
  }
}
