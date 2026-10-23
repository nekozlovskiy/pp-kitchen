import { config } from "../config";
import { recipeMap } from "../data";
import { todayKey } from "./format";
import { readJSON, writeJSON } from "./storage";

/** Записки, рецепты которых есть на сайте: опечатка в id не должна давать вечно закрытый конверт. */
export const secretNoteIds = (): string[] =>
  Object.keys(config.secretNotes).filter((id) => recipeMap[id] && config.secretNotes[id]?.text?.trim());

export const noteText = (id: string) => config.secretNotes[id]?.text ?? "";
export const noteHint = (id: string) => config.secretNotes[id]?.hint?.trim() || "В одном из рецептов";

/**
 * Какую записку открыть: первый рецепт с запиской, который приготовили за эту сессию (cooked вырос).
 * Готовка до открытия сайта не считается — записку находят, когда готовят сейчас.
 */
export function newlyCooked(before: Record<string, number>, now: Record<string, number>, ids: readonly string[]): string | undefined {
  return ids.find((id) => (now[id] ?? 0) > (before[id] ?? 0));
}

export type Found = { id: string; date: string };

export function readFound(): Found[] {
  const f = readJSON<Found[]>("pp.foundNotes", []);
  return Array.isArray(f) ? f.filter((x) => typeof x?.id === "string" && typeof x?.date === "string") : [];
}

/** Отметить записку найденной; true — если она найдена впервые. */
export function markFound(id: string, date = todayKey()): boolean {
  const found = readFound();
  if (found.some((f) => f.id === id)) return false;
  writeJSON("pp.foundNotes", [...found, { id, date }]);
  // «Моя кухня» под листом рецепта узнаёт о находке сразу, а не при следующей перерисовке.
  window.dispatchEvent(new Event("pp-found-note"));
  return true;
}
