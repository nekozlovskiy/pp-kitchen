import type { Category, Macros, Recipe } from "../types";
import { todayKey } from "./format";
import { readJSON, writeJSON } from "./storage";

const CHEESE = new Set([
  "cheese_light", "cheese_hard", "cheese_fat_free", "mozzarella", "parmesan", "feta", "suluguni", "ricotta",
  "cream_cheese", "processed_cheese", "adyghe_cheese", "gorgonzola",
]);

export type MoodCtx = { macros: Macros; proteinDense: boolean };

/** Настроения для «Чего хочется?»: одно нажатие сужает выбор перед колодой. */
export const moods: { id: string; label: string; test: (r: Recipe, c: MoodCtx) => boolean }[] = [
  { id: "hearty", label: "🍲 Сытно", test: (_, c) => c.macros.kcal >= 450 },
  { id: "light", label: "🥗 Легко", test: (_, c) => c.macros.kcal <= 350 },
  { id: "quick", label: "⚡ Быстро", test: (r) => r.timeMinutes <= 25 },
  { id: "protein", label: "💪 Белково", test: (_, c) => c.proteinDense },
  { id: "sweet", label: "🍫 Сладкого", test: (r) => r.category === "dessert" },
  { id: "cheesy", label: "🧀 Сырного", test: (r) => r.ingredients.some((i) => CHEESE.has(i.id)) },
  { id: "any", label: "🎲 Удиви меня", test: () => true },
];

export const DECK_SIZE = 10;

/** Колода: подходящие под раздел и настроение блюда в случайном порядке, без смахнутых сегодня. */
export function buildDeck(
  pool: readonly Recipe[],
  opts: { category: Category | "all"; mood: string; skipped: ReadonlySet<string>; ctx: (r: Recipe) => MoodCtx },
  random: () => number = Math.random,
  size = DECK_SIZE,
): Recipe[] {
  const mood = moods.find((m) => m.id === opts.mood) ?? moods[moods.length - 1];
  const list = pool.filter(
    (r) => (opts.category === "all" || r.category === opts.category) && !opts.skipped.has(r.id) && mood.test(r, opts.ctx(r)),
  );
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list.slice(0, size);
}

export type SwipeDay = { date: string; skipped: string[]; liked: string[] };

/** Отметки колоды живут один день: «не сегодня» и «хочу» сбрасываются назавтра. */
export function readSwipeDay(today = todayKey()): SwipeDay {
  const saved = readJSON<SwipeDay | null>("pp.swipe", null);
  if (!saved || saved.date !== today || !Array.isArray(saved.skipped) || !Array.isArray(saved.liked)) {
    return { date: today, skipped: [], liked: [] };
  }
  return saved;
}

export function saveSwipeDay(day: SwipeDay): void {
  writeJSON("pp.swipe", day);
}
