import { useEffect, useState } from "react";
import { readJSON, writeJSON } from "./storage";

/** Рецепт, который готовится прямо сейчас: отмеченные продукты, шаг и число порций. */
export type Cooking = { id: string; checked: number[]; step: number; servings: number; at: number };

const KEY = "pp.cooking";
const EVENT = "pp-cooking";
/** Через 12 часов готовка считается законченной: вчерашние отметки не нужны. */
export const COOKING_TTL = 12 * 60 * 60 * 1000;

export function readCooking(now = Date.now()): Cooking | null {
  const c = readJSON<Cooking | null>(KEY, null);
  if (!c || typeof c.id !== "string" || typeof c.at !== "number" || now - c.at > COOKING_TTL) return null;
  return {
    id: c.id,
    checked: Array.isArray(c.checked) ? c.checked.filter((i) => Number.isInteger(i) && i >= 0) : [],
    step: Number.isInteger(c.step) && c.step >= 0 ? c.step : 0,
    servings: Number.isFinite(c.servings) && c.servings > 0 ? c.servings : 1,
    at: c.at,
  };
}

export function saveCooking(c: Omit<Cooking, "at">): void {
  writeJSON(KEY, { ...c, at: Date.now() });
  window.dispatchEvent(new Event(EVENT));
}

export function clearCooking(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* хранилище недоступно */
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Текущая готовка; обновляется, когда рецепт сохраняет прогресс (и из других вкладок). */
export function useCooking(): Cooking | null {
  const [c, setC] = useState(() => readCooking());
  useEffect(() => {
    const update = () => setC(readCooking());
    window.addEventListener(EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);
  return c;
}
