import type { Ingredient, Recipe } from "../types";

export function normalize(s: string): string {
  return s.toLowerCase().replace(/ё/g, "е");
}

/**
 * Простая основа слова для русского: отрезаем окончание, оставляя корень.
 * «курица» → «кури» (найдёт «куриная»), «яблоки» → «ябло», «творога» → «творо».
 */
export function stem(word: string): string {
  const w = normalize(word).replace(/[^a-zа-я0-9]/g, "");
  if (w.length <= 4) return w;
  return w.slice(0, w.length - (w.length >= 6 ? 2 : 1));
}

export function searchText(r: Recipe, map: Record<string, Ingredient>): string {
  const ings = r.ingredients.map((i) => map[i.id]?.name ?? "").join(" ");
  return normalize(`${r.title} ${r.description} ${ings}`);
}

/**
 * Все слова запроса должны найтись (по основе, с начала слова)
 * в названии, описании или продуктах: «рис» найдёт «рисовую», но не «барбарис».
 */
export function matches(text: string, query: string): boolean {
  const stems = normalize(query)
    .split(/[\s,.;]+/)
    .filter(Boolean)
    .map(stem)
    .filter((s) => s.length >= 2);
  // stem() оставляет только буквы и цифры, поэтому экранировать нечего
  return stems.every((s) => new RegExp(`(^|[^а-яa-z0-9])${s}`).test(text));
}
