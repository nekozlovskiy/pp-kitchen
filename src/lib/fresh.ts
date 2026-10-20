import { daysSince } from "./collections";

/** Когда телефон впервые увидел рецепт: id → «ГГГГ-ММ-ДД». "" — рецепт был на сайте ещё до первого визита. */
export type Known = Record<string, string>;

/** Сколько дней рецепт считается новым. */
export const FRESH_DAYS = 14;

/**
 * Дописывает рецепты, которых телефон ещё не видел. При самом первом визите новым ничего не считается:
 * иначе «новыми» оказались бы все рецепты сайта сразу.
 */
export function updateKnown(saved: Known | null, ids: string[], today: string): Known {
  const first = !saved || typeof saved !== "object" || !Object.keys(saved).length;
  const next: Known = {};
  for (const id of ids) next[id] = first ? "" : (saved![id] ?? today);
  return next;
}

/** Рецепты, появившиеся за последние FRESH_DAYS дней. */
export function freshIds(known: Known, today = new Date()): Set<string> {
  return new Set(Object.entries(known).filter(([, d]) => d && daysSince(d, today) < FRESH_DAYS).map(([id]) => id));
}
