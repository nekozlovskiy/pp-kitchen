import type { Ingredient } from "../types";

/** Русские склонения: plural(5, ["порция", "порции", "порций"]) → "порций". */
export function plural(n: number, forms: [string, string, string]): string {
  const abs = Math.abs(Math.trunc(n));
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}

/** Округление граммов: мелочь точнее, крупное до 5 г. */
export function roundGrams(g: number): number {
  if (g < 10) return Math.round(g * 2) / 2;
  if (g < 100) return Math.round(g);
  return Math.round(g / 5) * 5;
}

/** "120 г", "200 мл", "2 шт · 110 г" для штучных продуктов. */
export function formatAmount(ing: Ingredient | undefined, grams: number): string {
  const g = roundGrams(grams);
  const unit = ing?.unit === "ml" ? "мл" : "г";
  if (ing?.piece) {
    const pieces = Math.round((grams / ing.piece.grams) * 2) / 2;
    if (pieces >= 0.5) {
      const p = Number.isInteger(pieces) ? String(pieces) : pieces.toString().replace(".", ",");
      return `${p} ${ing.piece.label}, ${g} ${unit}`;
    }
  }
  return `${String(g).replace(".", ",")} ${unit}`;
}

export function formatTime(min: number): string {
  if (min < 60) return `${min} мин`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} ч ${m} мин` : `${h} ч`;
}

export function servingsLabel(n: number): string {
  return `${n} ${plural(n, ["порция", "порции", "порций"])}`;
}

export function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
