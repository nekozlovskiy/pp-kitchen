import { readJSON, writeJSON } from "./storage";

/**
 * «Готовим вдвоём»: Анюта раздаёт шаги и отправляет ссылку с его частью.
 * В ссылке номера шагов (с нуля) и число порций: #/together/<id>?n=2&s=0.2.4
 */
export function togetherLink(recipeId: string, servings: number, mine: readonly number[]): string {
  return `${location.origin}${location.pathname}#/together/${recipeId}?n=${servings}&s=${[...mine].sort((a, b) => a - b).join(".")}`;
}

/** Разобрать параметры ссылки; мусор и номера вне рецепта отбрасываются. */
export function parseTogether(params: URLSearchParams, stepCount: number, defaultServings: number): { servings: number; steps: number[] } {
  const n = Number(params.get("n"));
  const servings = Number.isInteger(n) && n >= 1 && n <= 20 ? n : defaultServings;
  const steps = [...new Set((params.get("s") ?? "").split(".").filter(Boolean).map(Number))]
    .filter((i) => Number.isInteger(i) && i >= 0 && i < stepCount)
    .sort((a, b) => a - b);
  return { servings, steps };
}

type Assignments = Record<string, number[]>;

/** Раздача запоминается для рецепта, чтобы в следующий раз не делать её заново. */
export function readAssignment(recipeId: string): number[] {
  const all = readJSON<Assignments>("pp.together", {});
  return Array.isArray(all[recipeId]) ? all[recipeId].filter((i) => Number.isInteger(i)) : [];
}

export function saveAssignment(recipeId: string, steps: readonly number[]): void {
  const all = readJSON<Assignments>("pp.together", {});
  if (steps.length) all[recipeId] = [...steps];
  else delete all[recipeId];
  writeJSON("pp.together", all);
}
