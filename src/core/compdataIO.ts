import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import type {
  CompdataAdvancement,
  CompdataCompetitionSummary,
  CompdataInitTeam,
  CompdataObject,
  CompdataOpenProgress,
  CompdataProject,
  CompdataScheduleEntry,
  CompdataSetting,
  CompdataStandingSlot,
  CompdataTask
} from "../shared/types";

type CompdataOpenProgressCallback = (progress: CompdataOpenProgress) => void;

const mainCompdataFiles = [
  "compobj.txt",
  "compids.txt",
  "settings.txt",
  "tasks.txt",
  "schedule.txt",
  "standings.txt",
  "advancement.txt",
  "initteams.txt",
  "weather.txt",
  "activeteams.txt",
  "objectives.txt"
];

const requiredCompdataFiles = mainCompdataFiles.filter((fileName) => !["activeteams.txt", "objectives.txt"].includes(fileName));

function emitProgress(
  onProgress: CompdataOpenProgressCallback | undefined,
  phase: CompdataOpenProgress["phase"],
  currentStep: number,
  totalSteps: number,
  message: string,
  fileName?: string
): void {
  onProgress?.({
    phase,
    fileName,
    currentStep,
    totalSteps,
    percent: totalSteps > 0 ? Math.max(0, Math.min(100, Math.round((currentStep / totalSteps) * 100))) : 0,
    message
  });
}

function readOptionalText(folderPath: string, filesByLowerName: Map<string, string>, fileName: string, warnings: string[]): string {
  const match = filesByLowerName.get(fileName.toLowerCase());
  if (!match) {
    warnings.push(`${fileName} was not found.`);
    return "";
  }
  return readFileSync(join(folderPath, match), "utf8");
}

function hasFile(filesByLowerName: Map<string, string>, fileName: string): boolean {
  return filesByLowerName.has(fileName.toLowerCase());
}

function rows(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => line.split(",").map((part) => part.trim()));
}

function numberValue(value: string | undefined, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseObjects(text: string, warnings: string[]): CompdataObject[] {
  return rows(text).map((row, index) => {
    if (row.length < 5) {
      warnings.push(`compobj.txt line ${index + 1} has ${row.length} column(s); expected 5.`);
    }
    return {
      id: numberValue(row[0]),
      kind: numberValue(row[1]),
      shortName: row[2] ?? "",
      description: row[3] ?? "",
      parentId: numberValue(row[4], -1)
    };
  });
}

function parseCompIds(text: string): number[] {
  return rows(text).map((row) => numberValue(row[0])).filter((id) => id > 0);
}

function parseSettings(text: string): CompdataSetting[] {
  return rows(text).map((row) => ({
    objectId: numberValue(row[0]),
    key: row[1] ?? "",
    value: row.slice(2).join(",")
  }));
}

function parseTasks(text: string, warnings: string[]): CompdataTask[] {
  return rows(text).map((row, index) => {
    if (row.length < 7) {
      warnings.push(`tasks.txt line ${index + 1} has ${row.length} column(s); expected 7.`);
    }
    return {
      competitionId: numberValue(row[0]),
      timing: row[1] ?? "",
      action: row[2] ?? "",
      targetId: numberValue(row[3]),
      param1: row[4] ?? "",
      param2: row[5] ?? "",
      param3: row[6] ?? ""
    };
  });
}

function parseSchedules(text: string): CompdataScheduleEntry[] {
  return rows(text).map((row) => ({
    objectId: numberValue(row[0]),
    day: numberValue(row[1]),
    round: numberValue(row[2]),
    minGames: numberValue(row[3]),
    maxGames: numberValue(row[4]),
    time: row[5] ?? ""
  }));
}

function parseStandings(text: string): CompdataStandingSlot[] {
  return rows(text).map((row) => ({
    groupId: numberValue(row[0]),
    position: numberValue(row[1])
  }));
}

function parseAdvancements(text: string): CompdataAdvancement[] {
  return rows(text).map((row) => ({
    fromGroupId: numberValue(row[0]),
    fromPosition: numberValue(row[1]),
    toGroupId: numberValue(row[2]),
    toPosition: numberValue(row[3])
  }));
}

function parseInitTeams(text: string): CompdataInitTeam[] {
  return rows(text).map((row) => ({
    competitionId: numberValue(row[0]),
    position: numberValue(row[1]),
    teamId: row[2] ?? ""
  }));
}

function descendantsByParent(objects: CompdataObject[]): Map<number, CompdataObject[]> {
  const byParent = new Map<number, CompdataObject[]>();
  for (const object of objects) {
    const children = byParent.get(object.parentId) ?? [];
    children.push(object);
    byParent.set(object.parentId, children);
  }
  return byParent;
}

function collectDescendantIds(rootId: number, byParent: Map<number, CompdataObject[]>): Set<number> {
  const ids = new Set<number>([rootId]);
  const stack = [...(byParent.get(rootId) ?? [])];
  while (stack.length > 0) {
    const object = stack.pop();
    if (!object || ids.has(object.id)) {
      continue;
    }
    ids.add(object.id);
    stack.push(...(byParent.get(object.id) ?? []));
  }
  return ids;
}

function competitionSummaries(
  objects: CompdataObject[],
  compIds: number[],
  settings: CompdataSetting[],
  tasks: CompdataTask[],
  schedules: CompdataScheduleEntry[],
  standings: CompdataStandingSlot[],
  advancements: CompdataAdvancement[],
  initTeams: CompdataInitTeam[],
  warnings: string[]
): CompdataCompetitionSummary[] {
  const byId = new Map(objects.map((object) => [object.id, object]));
  const byParent = descendantsByParent(objects);
  const ids = compIds.length > 0 ? compIds : objects.filter((object) => object.kind === 3).map((object) => object.id);

  return ids
    .map((id) => {
      const competition = byId.get(id);
      if (!competition) {
        warnings.push(`compids.txt references missing competition object ${id}.`);
        return undefined;
      }
      const descendantIds = collectDescendantIds(id, byParent);
      const stages = (byParent.get(id) ?? []).filter((object) => object.kind === 4);
      const stageIds = new Set(stages.map((stage) => stage.id));
      const groups = [...descendantIds].map((candidate) => byId.get(candidate)).filter((object): object is CompdataObject => object?.kind === 5);
      const groupIds = new Set(groups.map((group) => group.id));
      return {
        id: competition.id,
        shortName: competition.shortName,
        description: competition.description,
        parentId: competition.parentId,
        stages,
        groups,
        settingsCount: settings.filter((setting) => descendantIds.has(setting.objectId)).length,
        tasksCount: tasks.filter((task) => task.competitionId === id).length,
        scheduleCount: schedules.filter((schedule) => descendantIds.has(schedule.objectId) || stageIds.has(schedule.objectId) || groupIds.has(schedule.objectId)).length,
        standingsCount: standings.filter((standing) => groupIds.has(standing.groupId)).length,
        advancementCount: advancements.filter((advancement) => groupIds.has(advancement.fromGroupId) || groupIds.has(advancement.toGroupId)).length,
        initTeamsCount: initTeams.filter((team) => team.competitionId === id).length
      };
    })
    .filter((summary): summary is CompdataCompetitionSummary => Boolean(summary));
}

export function openCompdataProject(folderPath: string, onProgress?: CompdataOpenProgressCallback): CompdataProject {
  const warnings: string[] = [];
  const filesByLowerName = new Map(readdirSync(folderPath).map((fileName) => [fileName.toLowerCase(), fileName]));
  const missingRequiredFiles = requiredCompdataFiles.filter((fileName) => !hasFile(filesByLowerName, fileName));
  if (missingRequiredFiles.length > 0) {
    throw new Error(`Compdata folder is missing required file(s): ${missingRequiredFiles.join(", ")}`);
  }
  const totalSteps = mainCompdataFiles.length + 10;
  let step = 0;
  const readFile = (fileName: string): string => {
    emitProgress(onProgress, "reading", step, totalSteps, `Reading ${fileName}`, fileName);
    const text = readOptionalText(folderPath, filesByLowerName, fileName, warnings);
    step += 1;
    emitProgress(onProgress, "reading", step, totalSteps, `${fileName} loaded`, fileName);
    return text;
  };
  const parseStep = <T>(message: string, parse: () => T): T => {
    emitProgress(onProgress, "parsing", step, totalSteps, message);
    const value = parse();
    step += 1;
    emitProgress(onProgress, "parsing", step, totalSteps, message);
    return value;
  };

  const compobj = readFile("compobj.txt");
  const compids = readFile("compids.txt");
  const settingsText = readFile("settings.txt");
  const tasksText = readFile("tasks.txt");
  const scheduleText = readFile("schedule.txt");
  const standingsText = readFile("standings.txt");
  const advancementText = readFile("advancement.txt");
  const initTeamsText = readFile("initteams.txt");
  const weatherText = readFile("weather.txt");
  const hasActiveTeams = hasFile(filesByLowerName, "activeteams.txt");
  const activeTeamsText = hasActiveTeams ? readFile("activeteams.txt") : "";
  if (!hasActiveTeams) {
    step += 1;
  }
  const hasObjectives = hasFile(filesByLowerName, "objectives.txt");
  const objectiveText = hasObjectives ? readFile("objectives.txt") : "";
  if (!hasObjectives) {
    step += 1;
  }
  const objects = parseStep("Parsing compobj.txt", () => parseObjects(compobj, warnings));
  const compIds = parseStep("Parsing compids.txt", () => parseCompIds(compids));
  const settings = parseStep("Parsing settings.txt", () => parseSettings(settingsText));
  const tasks = parseStep("Parsing tasks.txt", () => parseTasks(tasksText, warnings));
  const schedules = parseStep("Parsing schedule.txt", () => parseSchedules(scheduleText));
  const standings = parseStep("Parsing standings.txt", () => parseStandings(standingsText));
  const advancements = parseStep("Parsing advancement.txt", () => parseAdvancements(advancementText));
  const initTeams = parseStep("Parsing initteams.txt", () => parseInitTeams(initTeamsText));
  const weatherRows = parseStep("Parsing weather.txt", () => rows(weatherText));
  emitProgress(onProgress, "building", step, totalSteps, "Building competition summaries");
  const competitions = competitionSummaries(objects, compIds, settings, tasks, schedules, standings, advancements, initTeams, warnings);
  step += 1;
  emitProgress(onProgress, "loaded", totalSteps, totalSteps, "Compdata loaded");

  return {
    title: basename(folderPath),
    folderPath,
    objects,
    compIds,
    settings,
    tasks,
    schedules,
    standings,
    advancements,
    initTeams,
    weatherRows,
    activeTeamsRows: activeTeamsText ? rows(activeTeamsText) : [],
    objectiveRows: objectiveText ? rows(objectiveText) : [],
    warnings,
    competitions
  };
}

function line(parts: Array<number | string>): string {
  return parts.map((part) => String(part)).join(",");
}

function serializeRows(dataRows: string[][]): string {
  return `${dataRows.map((row) => line(row)).join("\n")}\n`;
}

export function saveCompdataProject(project: CompdataProject): { folderPath: string; filesWritten: number; warnings: string[] } {
  const writes: Array<{ fileName: string; content: string }> = [
    {
      fileName: "compobj.txt",
      content: `${project.objects.map((object) => line([object.id, object.kind, object.shortName, object.description, object.parentId])).join("\n")}\n`
    },
    {
      fileName: "compids.txt",
      content: `${project.compIds.map((id) => String(id)).join("\n")}\n`
    },
    {
      fileName: "settings.txt",
      content: `${project.settings.map((setting) => line([setting.objectId, setting.key, setting.value])).join("\n")}\n`
    },
    {
      fileName: "tasks.txt",
      content: `${project.tasks.map((task) => line([task.competitionId, task.timing, task.action, task.targetId, task.param1, task.param2, task.param3])).join("\n")}\n`
    },
    {
      fileName: "schedule.txt",
      content: `${project.schedules.map((schedule) => line([schedule.objectId, schedule.day, schedule.round, schedule.minGames, schedule.maxGames, schedule.time])).join("\n")}\n`
    },
    {
      fileName: "standings.txt",
      content: `${project.standings.map((standing) => line([standing.groupId, standing.position])).join("\n")}\n`
    },
    {
      fileName: "advancement.txt",
      content: `${project.advancements.map((advancement) => line([advancement.fromGroupId, advancement.fromPosition, advancement.toGroupId, advancement.toPosition])).join("\n")}\n`
    },
    {
      fileName: "initteams.txt",
      content: `${project.initTeams.map((team) => line([team.competitionId, team.position, team.teamId])).join("\n")}\n`
    },
    {
      fileName: "weather.txt",
      content: serializeRows(project.weatherRows)
    }
  ];

  if (project.activeTeamsRows.length > 0) {
    writes.push({ fileName: "activeteams.txt", content: serializeRows(project.activeTeamsRows) });
  }
  if (project.objectiveRows.length > 0) {
    writes.push({ fileName: "objectives.txt", content: serializeRows(project.objectiveRows) });
  }

  for (const write of writes) {
    writeFileSync(join(project.folderPath, write.fileName), write.content, "utf8");
  }

  return {
    folderPath: project.folderPath,
    filesWritten: writes.length,
    warnings: []
  };
}
