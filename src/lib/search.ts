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

// Раздел меню тоже ищется: «завтрак» находит завтраки, даже если слова нет в названии.
const CATEGORY_WORDS: Record<Recipe["category"], string> = {
  breakfast: "завтрак",
  lunch: "обед",
  dinner: "ужин",
  snack: "перекус",
  dessert: "десерт сладкое",
};

export function searchText(r: Recipe, map: Record<string, Ingredient>): string {
  const ings = r.ingredients.map((i) => map[i.id]?.name ?? "").join(" ");
  return normalize(`${r.title} ${r.description} ${ings} ${CATEGORY_WORDS[r.category]}`);
}

/** Разговорные и синонимичные слова: основа запроса → другие основы, которые тоже подходят. */
const SYNONYMS: Record<string, string[]> = {
  цукин: ["кабач"],
  кабач: ["цукин"],
  картош: ["картоф"],
  картоф: ["картош"],
  томат: ["помид"],
  помид: ["томат"],
  кура: ["кури"],
  курочк: ["кури"],
  сладк: ["десерт"],
  синеньк: ["баклаж"],
};

/** Расстояние Дамерау — Левенштейна с ранним выходом: больше `max` — неинтересно. */
function distance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)] as number[]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let rowMin = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      rowMin = Math.min(rowMin, d[i][j]);
    }
    if (rowMin > max) return max + 1;
  }
  return d[a.length][b.length];
}

/**
 * Слово запроса с опечаткой: целые слова отличаются на 1 букву (на 2 — у длинных),
 * либо основы длиннее 5 букв отличаются на одну. Короткие слова с опечаткой путаются с чужими.
 */
function fuzzy(words: string[], word: string): boolean {
  if (word.length < 5) return false;
  const max = word.length >= 8 ? 2 : 1;
  const s = stem(word);
  return words.some((w) => distance(word, w, max) <= max || (s.length >= 6 && distance(s, stem(w), 1) <= 1));
}

/**
 * Все слова запроса должны найтись (по основе, с начала слова) в названии, описании, продуктах или разделе:
 * «рис» найдёт «рисовую», но не «барбарис». Если точного начала нет — подходят синонимы и слова с опечаткой.
 */
export function matches(text: string, query: string): boolean {
  const qwords = normalize(query)
    .split(/[\s,.;]+/)
    .map((w) => w.replace(/[^a-zа-я0-9]/g, ""))
    .filter((w) => stem(w).length >= 2);
  let words: string[] | null = null;
  // stem() оставляет только буквы и цифры, поэтому экранировать нечего
  const exact = (s: string) => new RegExp(`(^|[^а-яa-z0-9])${s}`).test(text);
  return qwords.every((q) => {
    const s = stem(q);
    if (exact(s)) return true;
    const alt = s.length >= 4 ? Object.entries(SYNONYMS).find(([k]) => s.startsWith(k) || k.startsWith(s)) : undefined;
    if (alt && alt[1].some(exact)) return true;
    words ??= text.split(/[^а-яa-z0-9]+/).filter(Boolean);
    return fuzzy(words, q);
  });
}
