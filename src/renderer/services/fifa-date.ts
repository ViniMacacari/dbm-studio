import { registerFifaDatePrototype } from "fifadate";

registerFifaDatePrototype();

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

function validDateParts(year: number, month: number, day: number, date: Date): boolean {
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function fifaDateCodeToIso(value: string): string | undefined {
  const numeric = Number(value);
  if (!Number.isInteger(numeric)) {
    return undefined;
  }

  const date = Date.fromFifaDate(numeric);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString().slice(0, 10);
}

export function fifaDateCodeToAge(value: string): number | undefined {
  const numeric = Number(value);
  if (!Number.isInteger(numeric)) {
    return undefined;
  }

  const date = Date.fromFifaDate(numeric);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.age();
}

export function isoToFifaDateCode(value: string, context = "date"): string {
  if (!isoDatePattern.test(value)) {
    throw new Error(`${context}: expected YYYY-MM-DD.`);
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (!validDateParts(year, month, day, date)) {
    throw new Error(`${context}: invalid calendar date.`);
  }

  return String(date.toFifaDate());
}

export function datePartsToFifaDateCode(year: number, month: number, day: number, context = "date"): string {
  const paddedMonth = String(month).padStart(2, "0");
  const paddedDay = String(day).padStart(2, "0");
  return isoToFifaDateCode(`${year}-${paddedMonth}-${paddedDay}`, context);
}
