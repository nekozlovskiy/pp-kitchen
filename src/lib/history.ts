import type { Macros } from "../types";
import { todayKey } from "./format";

/** Итоги «Моего дня» по датам «ГГГГ-ММ-ДД»: хранятся последние 14 дней. */
export type History = Record<string, Macros>;

const KEEP_DAYS = 14;

/** Записывает итог дня; пустой день убирает. Старше двух недель — удаляется. */
export function withDay(history: History, date: string, totals: Macros): History {
  const next: History = { ...history };
  if (totals.kcal > 0) next[date] = totals;
  else delete next[date];
  const keep = Object.keys(next).sort().slice(-KEEP_DAYS);
  return Object.fromEntries(keep.map((k) => [k, next[k]]));
}

/** Последние `n` дней по порядку, заканчивая сегодняшним; дни без записей — null. */
export function lastDays(history: History, n: number, today = new Date()): { date: string; totals: Macros | null }[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (n - 1 - i));
    const date = todayKey(d);
    return { date, totals: history[date] ?? null };
  });
}

/** Проверка сохранённых данных: только даты и числа. */
export function cleanHistory(raw: unknown): History {
  if (!raw || typeof raw !== "object") return {};
  const out: History = {};
  for (const [k, v] of Object.entries(raw as Record<string, Macros>)) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(k) && v && [v.kcal, v.p, v.f, v.c].every((x) => typeof x === "number" && Number.isFinite(x))) out[k] = v;
  }
  return out;
}
