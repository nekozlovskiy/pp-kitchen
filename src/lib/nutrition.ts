import type { Ingredient, Macros, Recipe } from "../types";

const ZERO: Macros = { kcal: 0, p: 0, f: 0, c: 0 };

/** Сумма КБЖУ всего рецепта по граммам продуктов. Неизвестные id пропускаются. */
export function recipeTotals(recipe: Recipe, map: Record<string, Ingredient>): Macros {
  return recipe.ingredients.reduce<Macros>((acc, item) => {
    const ing = map[item.id];
    if (!ing) return acc;
    const k = item.grams / 100;
    return {
      kcal: acc.kcal + ing.per100.kcal * k,
      p: acc.p + ing.per100.p * k,
      f: acc.f + ing.per100.f * k,
      c: acc.c + ing.per100.c * k,
    };
  }, ZERO);
}

/** КБЖУ одной порции (без округления). */
export function perServing(recipe: Recipe, map: Record<string, Ingredient>): Macros {
  return scale(recipeTotals(recipe, map), 1 / Math.max(1, recipe.servings));
}

export function scale(m: Macros, factor: number): Macros {
  return { kcal: m.kcal * factor, p: m.p * factor, f: m.f * factor, c: m.c * factor };
}

export function sum(list: Macros[]): Macros {
  return list.reduce(
    (a, m) => ({ kcal: a.kcal + m.kcal, p: a.p + m.p, f: a.f + m.f, c: a.c + m.c }),
    ZERO,
  );
}

/** Округление для показа: калории до целых, БЖУ до целых граммов. */
export function round(m: Macros): Macros {
  return { kcal: Math.round(m.kcal), p: Math.round(m.p), f: Math.round(m.f), c: Math.round(m.c) };
}

/**
 * Доли калорий из белков, жиров и углеводов в процентах (4·Б, 9·Ж, 4·У).
 * Сумма всегда 100 (остаток уходит в самую крупную долю), для пустого блюда — нули.
 */
export function macroPercents(m: Macros): { p: number; f: number; c: number } {
  const kp = m.p * 4;
  const kf = m.f * 9;
  const kc = m.c * 4;
  const total = kp + kf + kc;
  if (total <= 0) return { p: 0, f: 0, c: 0 };
  const raw = { p: (kp / total) * 100, f: (kf / total) * 100, c: (kc / total) * 100 };
  const out = { p: Math.round(raw.p), f: Math.round(raw.f), c: Math.round(raw.c) };
  const diff = 100 - (out.p + out.f + out.c);
  if (diff !== 0) {
    const key = (Object.keys(raw) as (keyof typeof raw)[]).reduce((a, b) => (raw[a] >= raw[b] ? a : b));
    out[key] += diff;
  }
  return out;
}

/** Граммы продуктов под нужное число порций. */
export function scaleIngredients(recipe: Recipe, servings: number): { id: string; grams: number }[] {
  const k = servings / Math.max(1, recipe.servings);
  return recipe.ingredients.map((i) => ({ id: i.id, grams: i.grams * k }));
}
