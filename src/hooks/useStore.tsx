import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { readJSON, writeJSON } from "../lib/storage";
import { todayKey } from "../lib/format";
import { config } from "../config";
import { ingredientMap, recipeMap, servingMacros } from "../data";
import { perServing } from "../lib/nutrition";
import { SWAPS, applySwaps } from "../lib/swaps";
import type { Macros } from "../types";
import { dietLabels } from "../lib/diet";
import type { DietTag } from "../lib/diet";

/** servings — доля порции; grams — показывать и менять в граммах вместо порций. */
export type DayItem = { id: string; servings: number; grams?: boolean };
type DayState = { date: string; items: DayItem[] };
export type ShoppingState = { items: DayItem[]; checked: string[] };
/** Личные отметки к рецепту. Всё хранится только в этом браузере. */
export type JournalEntry = { note?: string; cooked?: number; last?: string; rating?: number; photo?: number };

type Store = {
  favorites: Set<string>;
  toggleFavorite: (id: string) => void;
  day: DayItem[];
  addToDay: (id: string, servings?: number) => void;
  setDayServings: (index: number, servings: number) => void;
  toggleDayUnit: (index: number) => void;
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
  journal: Record<string, JournalEntry>;
  updateJournal: (id: string, patch: Partial<JournalEntry>) => void;
  markCooked: (id: string) => void;
  exclude: DietTag[];
  toggleExclude: (tag: DietTag) => void;
  pantry: string[];
  togglePantry: (ingredientId: string) => void;
  clearPantry: () => void;
  proteinGoal: number;
  setProteinGoal: (g: number) => void;
  /** Включённые замены продуктов по рецептам. */
  swaps: Record<string, string[]>;
  toggleSwap: (recipeId: string, key: string) => void;
  /** КБЖУ порции с учётом замен. */
  servingFor: (recipeId: string) => Macros;
  /** Меню на неделю: семь списков блюд, понедельник — первый. */
  week: DayItem[][];
  addToWeek: (day: number, id: string, servings?: number) => void;
  removeFromWeek: (day: number, index: number) => void;
  setWeek: (days: DayItem[][]) => void;
  clearWeek: () => void;
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
  const [journal, setJournal] = useState<Record<string, JournalEntry>>(() => {
    const saved = readJSON<Record<string, JournalEntry>>("pp.journal", {});
    return saved && typeof saved === "object" ? saved : {};
  });
  const [exclude, setExclude] = useState<DietTag[]>(() =>
    readJSON<DietTag[]>("pp.exclude", []).filter((t) => t in dietLabels),
  );
  const [pantry, setPantry] = useState<string[]>(() =>
    readJSON<string[]>("pp.pantry", []).filter((id) => ingredientMap[id]),
  );
  const [proteinGoal, setProteinGoalState] = useState<number>(() => readJSON<number>("pp.proteinGoal", 90));
  const [swaps, setSwaps] = useState<Record<string, string[]>>(() => {
    const saved = readJSON<Record<string, string[]>>("pp.swaps", {});
    const known = new Set(SWAPS.map((s) => s.key));
    return Object.fromEntries(
      Object.entries(saved && typeof saved === "object" ? saved : {})
        .filter(([id, keys]) => recipeMap[id] && Array.isArray(keys))
        .map(([id, keys]) => [id, keys.filter((k) => known.has(k))]),
    );
  });

  useEffect(() => writeJSON("pp.journal", journal), [journal]);
  useEffect(() => writeJSON("pp.exclude", exclude), [exclude]);
  useEffect(() => writeJSON("pp.pantry", pantry), [pantry]);
  useEffect(() => writeJSON("pp.proteinGoal", proteinGoal), [proteinGoal]);
  const [week, setWeekState] = useState<DayItem[][]>(() => {
    const saved = readJSON<DayItem[][]>("pp.week", []);
    return Array.from({ length: 7 }, (_, d) =>
      Array.isArray(saved?.[d]) ? saved[d].filter((x) => x && recipeMap[x.id] && x.servings > 0) : [],
    );
  });
  useEffect(() => writeJSON("pp.swaps", swaps), [swaps]);
  useEffect(() => writeJSON("pp.week", week), [week]);
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
      toggleDayUnit: (index) => setDay((prev) => prev.map((x, j) => (j === index ? { ...x, grams: !x.grams } : x))),
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
      journal,
      updateJournal: (id, patch) => setJournal((j) => ({ ...j, [id]: { ...j[id], ...patch } })),
      markCooked: (id) =>
        setJournal((j) => ({ ...j, [id]: { ...j[id], cooked: (j[id]?.cooked ?? 0) + 1, last: todayKey() } })),
      exclude,
      toggleExclude: (tag) => setExclude((e) => (e.includes(tag) ? e.filter((t) => t !== tag) : [...e, tag])),
      pantry,
      togglePantry: (ingredientId) =>
        setPantry((p) => (p.includes(ingredientId) ? p.filter((x) => x !== ingredientId) : [...p, ingredientId])),
      clearPantry: () => setPantry([]),
      proteinGoal,
      setProteinGoal: (g) => setProteinGoalState(Math.max(30, Math.min(250, Math.round(g) || 90))),
      swaps,
      toggleSwap: (recipeId, key) =>
        setSwaps((s) => {
          const cur = s[recipeId] ?? [];
          return { ...s, [recipeId]: cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key] };
        }),
      week,
      addToWeek: (d, id, servings = 1) => setWeekState((w) => w.map((items, j) => (j === d ? [...items, { id, servings }] : items))),
      removeFromWeek: (d, index) => setWeekState((w) => w.map((items, j) => (j === d ? items.filter((_, k) => k !== index) : items))),
      setWeek: (days) => setWeekState(Array.from({ length: 7 }, (_, d) => days[d] ?? [])),
      clearWeek: () => setWeekState(Array.from({ length: 7 }, () => [])),
      servingFor: (recipeId) =>
        swaps[recipeId]?.length ? perServing(applySwaps(recipeMap[recipeId], swaps[recipeId]), ingredientMap) : servingMacros[recipeId],
    }),
    [favorites, toggleFavorite, day, addToDay, goal, shopping, toast, showToast, journal, exclude, pantry, proteinGoal, swaps, week],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore вне StoreProvider");
  return s;
}
