import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { readJSON, writeJSON } from "../lib/storage";
import { todayKey } from "../lib/format";
import { config } from "../config";
import { recipeMap } from "../data";

export type DayItem = { id: string; servings: number };
type DayState = { date: string; items: DayItem[] };
export type ShoppingState = { items: DayItem[]; checked: string[] };

type Store = {
  favorites: Set<string>;
  toggleFavorite: (id: string) => void;
  day: DayItem[];
  addToDay: (id: string, servings?: number) => void;
  setDayServings: (index: number, servings: number) => void;
  removeFromDay: (index: number) => void;
  clearDay: () => void;
  goal: number;
  setGoal: (kcal: number) => void;
  shopping: ShoppingState;
  addToShopping: (id: string, servings: number) => void;
  setShoppingServings: (index: number, servings: number) => void;
  removeFromShopping: (index: number) => void;
  toggleBought: (ingredientId: string) => void;
  clearShopping: () => void;
  toast: string | null;
  showToast: (msg: string) => void;
};

const Ctx = createContext<Store | null>(null);

function loadDay(): DayItem[] {
  const saved = readJSON<DayState | null>("pp.day", null);
  if (!saved || saved.date !== todayKey() || !Array.isArray(saved.items)) return [];
  return saved.items.filter((i) => recipeMap[i.id] && i.servings > 0);
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<Set<string>>(
    () => new Set(readJSON<string[]>("pp.favorites", []).filter((id) => recipeMap[id])),
  );
  const [day, setDay] = useState<DayItem[]>(loadDay);
  const [goal, setGoalState] = useState<number>(() => readJSON<number>("pp.goal", config.defaultGoalKcal));
  const [shopping, setShopping] = useState<ShoppingState>(() => {
    const saved = readJSON<ShoppingState>("pp.shopping", { items: [], checked: [] });
    return {
      items: Array.isArray(saved.items) ? saved.items.filter((i) => recipeMap[i.id] && i.servings > 0) : [],
      checked: Array.isArray(saved.checked) ? saved.checked : [],
    };
  });
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => writeJSON("pp.shopping", shopping), [shopping]);
  useEffect(() => writeJSON("pp.favorites", [...favorites]), [favorites]);
  useEffect(() => writeJSON("pp.day", { date: todayKey(), items: day }), [day]);
  useEffect(() => writeJSON("pp.goal", goal), [goal]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const addToDay = useCallback((id: string, servings = 1) => {
    setDay((prev) => {
      const i = prev.findIndex((x) => x.id === id);
      if (i === -1) return [...prev, { id, servings }];
      return prev.map((x, j) => (j === i ? { ...x, servings: x.servings + servings } : x));
    });
  }, []);

  const value = useMemo<Store>(
    () => ({
      favorites,
      toggleFavorite,
      day,
      addToDay,
      setDayServings: (index, servings) =>
        setDay((prev) => prev.map((x, j) => (j === index ? { ...x, servings } : x))),
      removeFromDay: (index) => setDay((prev) => prev.filter((_, j) => j !== index)),
      clearDay: () => setDay([]),
      goal,
      setGoal: (kcal) => setGoalState(Math.max(800, Math.min(5000, Math.round(kcal) || config.defaultGoalKcal))),
      shopping,
      addToShopping: (id, servings) =>
        setShopping((s) => {
          const i = s.items.findIndex((x) => x.id === id);
          const items =
            i === -1 ? [...s.items, { id, servings }] : s.items.map((x, j) => (j === i ? { ...x, servings: x.servings + servings } : x));
          return { ...s, items };
        }),
      setShoppingServings: (index, servings) =>
        setShopping((s) => ({ ...s, items: s.items.map((x, j) => (j === index ? { ...x, servings } : x)) })),
      removeFromShopping: (index) => setShopping((s) => ({ ...s, items: s.items.filter((_, j) => j !== index) })),
      toggleBought: (ingredientId) =>
        setShopping((s) => ({
          ...s,
          checked: s.checked.includes(ingredientId)
            ? s.checked.filter((c) => c !== ingredientId)
            : [...s.checked, ingredientId],
        })),
      clearShopping: () => setShopping({ items: [], checked: [] }),
      toast,
      showToast,
    }),
    [favorites, toggleFavorite, day, addToDay, goal, shopping, toast, showToast],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore вне StoreProvider");
  return s;
}
