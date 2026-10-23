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
export function readAssignment(recipeId: string, stepCount: number): number[] {
  const all = readJSON<Assignments>("pp.together", {});
  // Если шагов в рецепте стало меньше, лишние номера отбрасываем.
  return Array.isArray(all[recipeId]) ? all[recipeId].filter((i) => Number.isInteger(i) && i >= 0 && i < stepCount) : [];
}

type Checks<T> = { key: string; date: string; steps: T[] };

/**
 * Его галочки живут для одной ссылки и одного дня: новая раздача открывается чистой.
 * Шаги «Готовим вдвоём» — номерами, продукты из «Покупок» — id (свой ключ хранилища).
 */
export function readChecks<T extends number | string = number>(key: string, today: string, store = "pp.togetherChecks"): T[] {
  const c = readJSON<Checks<T> | null>(store, null);
  const ok = c && !Array.isArray(c) && c.key === key && c.date === today && Array.isArray(c.steps);
  return ok ? c.steps.filter((x) => typeof x === "number" || typeof x === "string") : [];
}

export function saveChecks<T extends number | string>(key: string, today: string, steps: readonly T[], store = "pp.togetherChecks"): void {
  writeJSON(store, { key, date: today, steps: [...steps] });
}

export function saveAssignment(recipeId: string, steps: readonly number[]): void {
  const all = readJSON<Assignments>("pp.together", {});
  if (steps.length) all[recipeId] = [...steps];
  else delete all[recipeId];
  writeJSON("pp.together", all);
}
