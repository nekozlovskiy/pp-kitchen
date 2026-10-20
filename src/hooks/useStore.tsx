import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { readJSON, writeJSON } from "../lib/storage";
import { todayKey } from "../lib/format";
import { cleanHistory, withDay } from "../lib/history";
import { freshIds, updateKnown } from "../lib/fresh";
import type { Known } from "../lib/fresh";
import type { History } from "../lib/history";
import { config } from "../config";
import { addUserRecipe, ingredientMap, recipeMap, recipes, removeUserRecipe, servingMacros } from "../data";
import { cleanMyRecipes } from "../lib/myRecipes";
import type { Macros, Recipe } from "../types";
import { perServing, scale, sum } from "../lib/nutrition";
import { SWAPS, applySwaps } from "../lib/swaps";
import { dietLabels } from "../lib/diet";
import type { DietTag } from "../lib/diet";

/** servings — доля порции; grams — показывать и менять в граммах вместо порций. */
export type DayItem = { id: string; servings: number; grams?: boolean };
/** Продукт без рецепта в «Моём дне»: id из таблицы продуктов и вес в граммах. */
export type FoodItem = { id: string; grams: number };
type DayState = { date: string; items: DayItem[]; foods?: FoodItem[] };

/** КБЖУ продуктов без рецепта по таблице продуктов. */
export function foodsMacros(foods: FoodItem[]): Macros {
  return sum(foods.map((f) => scale(ingredientMap[f.id].per100, f.grams / 100)));
}
export type ShoppingState = { items: DayItem[]; checked: string[] };
/** Личные отметки к рецепту. Всё хранится только в этом браузере. */
export type JournalEntry = { note?: string; cooked?: number; last?: string; rating?: number; photo?: number; dates?: string[] };

/** Сколько последних дат готовки помнить для ленты «Моя кухня». */
const KEEP_DATES = 50;

type Store = {
  favorites: Set<string>;
  toggleFavorite: (id: string) => void;
  day: DayItem[];
  addToDay: (id: string, servings?: number, grams?: boolean) => void;
  setDayServings: (index: number, servings: number) => void;
  toggleDayUnit: (index: number) => void;
  removeFromDay: (index: number) => void;
  clearDay: () => void;
  foods: FoodItem[];
  /** Последний прошедший день с записями и повтор его в сегодняшний. */
  lastDay: LastDay | null;
  repeatLastDay: () => void;
  addFood: (ingredientId: string, grams: number) => void;
  setFoodGrams: (index: number, grams: number) => void;
  removeFood: (index: number) => void;
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
  /** Свои рецепты: хранятся только в этом браузере, в каталог не попадают. */
  myRecipes: Recipe[];
  saveMyRecipe: (recipe: Recipe) => void;
  deleteMyRecipe: (id: string) => void;
  /** Рецепты, которые появились на сайте за последние две недели (для этого телефона). */
  fresh: ReadonlySet<string>;
  /** Нелюбимые продукты: рецепты с ними прячутся из каталога, подборок и меню. */
  dislikes: string[];
  toggleDislike: (ingredientId: string) => void;
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
  /** Итоги прошлых дней для графика в «Моём дне» */
  history: History;
  /** Меню на неделю: семь списков блюд, понедельник — первый. */
  week: DayItem[][];
  addToWeek: (day: number, id: string, servings?: number) => void;
  removeFromWeek: (day: number, index: number) => void;
  setWeek: (days: DayItem[][]) => void;
  clearWeek: () => void;
};

const Ctx = createContext<Store | null>(null);

// Свои рецепты регистрируются до первого рендера: сохранённые «Мой день» и покупки могут на них ссылаться.
const savedMine = cleanMyRecipes(readJSON<unknown>("pp.myRecipes", []));
savedMine.forEach(addUserRecipe);
// «Новое» — только про каталог: свои рецепты Анюта и так знает.
const catalogIds = recipes.map((r) => r.id);

function loadDay(): DayItem[] {
  const saved = readJSON<DayState | null>("pp.day", null);
  if (!saved || saved.date !== todayKey() || !Array.isArray(saved.items)) return [];
  return saved.items.filter((i) => recipeMap[i.id] && i.servings > 0);
}

/** Последний прошедший день с записями — для кнопки «Повторить вчера». */
export type LastDay = { date: string; items: DayItem[]; foods: FoodItem[] };

function cleanLastDay(raw: DayState | LastDay | null): LastDay | null {
  if (!raw || typeof raw.date !== "string" || raw.date >= todayKey()) return null;
  const items = Array.isArray(raw.items) ? raw.items.filter((i) => i && recipeMap[i.id] && i.servings > 0) : [];
  const foods = Array.isArray(raw.foods) ? raw.foods.filter((f) => f && ingredientMap[f.id] && f.grams > 0) : [];
  return items.length || foods.length ? { date: raw.date, items, foods } : null;
}

function loadLastDay(): LastDay | null {
  // Если сайт не открывали с прошлого дня, вчерашние записи ещё лежат в «pp.day».
  return cleanLastDay(readJSON<DayState | null>("pp.day", null)) ?? cleanLastDay(readJSON<LastDay | null>("pp.lastDay", null));
}

function loadFoods(): FoodItem[] {
  const saved = readJSON<DayState | null>("pp.day", null);
  if (!saved || saved.date !== todayKey() || !Array.isArray(saved.foods)) return [];
  return saved.foods.filter((f) => f && ingredientMap[f.id] && f.grams > 0);
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<Set<string>>(
    () => new Set(readJSON<string[]>("pp.favorites", []).filter((id) => recipeMap[id])),
  );
  const [day, setDay] = useState<DayItem[]>(loadDay);
  const [foods, setFoods] = useState<FoodItem[]>(loadFoods);
  const [lastDay, setLastDay] = useState<LastDay | null>(loadLastDay);
  useEffect(() => writeJSON("pp.lastDay", lastDay), [lastDay]);
  // Дата, к которой относится «Мой день»: телефон может держать вкладку открытой через полночь.
  const [dayDate, setDayDate] = useState(todayKey);
  useEffect(() => {
    const check = () => {
      const today = todayKey();
      if (today === dayDate) return;
      if (day.length || foods.length) setLastDay({ date: dayDate, items: day, foods });
      setDay([]);
      setFoods([]);
      setDayDate(today);
    };
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    const id = window.setInterval(check, 60_000);
    return () => {
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
      window.clearInterval(id);
    };
  }, [dayDate, day, foods]);
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
  const [myRecipes, setMyRecipes] = useState<Recipe[]>(savedMine);
  useEffect(() => writeJSON("pp.myRecipes", myRecipes), [myRecipes]);
  const [known] = useState<Known>(() => updateKnown(readJSON<Known | null>("pp.known", null), catalogIds, todayKey()));
  useEffect(() => writeJSON("pp.known", known), [known]);
  const fresh = useMemo(() => freshIds(known), [known]);
  const [dislikes, setDislikes] = useState<string[]>(() => {
    const saved = readJSON<string[]>("pp.dislikes", []);
    return Array.isArray(saved) ? saved.filter((id) => ingredientMap[id]) : [];
  });
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
  useEffect(() => writeJSON("pp.dislikes", dislikes), [dislikes]);
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
  useEffect(() => writeJSON("pp.day", { date: dayDate, items: day, foods }), [day, foods, dayDate]);
  const [history, setHistory] = useState<History>(() => cleanHistory(readJSON<unknown>("pp.history", {})));
  useEffect(() => writeJSON("pp.history", history), [history]);
  // Итог сегодняшнего дня сразу попадает в историю: завтра «Мой день» очистится, а график останется.
  useEffect(() => {
    const totals = sum([
      ...day.map((x) =>
        scale(swaps[x.id]?.length ? perServing(applySwaps(recipeMap[x.id], swaps[x.id]), ingredientMap) : servingMacros[x.id], x.servings),
      ),
      foodsMacros(foods),
    ]);
    setHistory((h) => withDay(h, dayDate, totals));
    // myRecipes: правка своего рецепта меняет его КБЖУ — итог дня в истории пересчитываем.
  }, [day, foods, swaps, dayDate, myRecipes]);
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

  const addToDay = useCallback((id: string, servings = 1, grams?: boolean) => {
    setDay((prev) => {
      const i = prev.findIndex((x) => x.id === id);
      if (i === -1) return [...prev, grams ? { id, servings, grams } : { id, servings }];
      return prev.map((x, j) => (j === i ? { ...x, servings: x.servings + servings, grams: x.grams || grams } : x));
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
      clearDay: () => {
        setDay([]);
        setFoods([]);
      },
      foods,
      lastDay,
      repeatLastDay: () => {
        if (!lastDay) return;
        setDay(lastDay.items.filter((i) => recipeMap[i.id]));
        setFoods(lastDay.foods.filter((f) => ingredientMap[f.id]));
      },
      addFood: (ingredientId, grams) =>
        setFoods((prev) => {
          const i = prev.findIndex((f) => f.id === ingredientId);
          if (i === -1) return [...prev, { id: ingredientId, grams }];
          return prev.map((f, j) => (j === i ? { ...f, grams: f.grams + grams } : f));
        }),
      setFoodGrams: (index, grams) => setFoods((prev) => prev.map((f, j) => (j === index ? { ...f, grams } : f))),
      removeFood: (index) => setFoods((prev) => prev.filter((_, j) => j !== index)),
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
        setJournal((j) => {
          const today = todayKey();
          // Старые записи без списка дат: прошлую дату «last» не теряем.
          const prev = j[id]?.dates ?? (j[id]?.last ? [j[id]!.last!] : []);
          const dates = [...prev, today].slice(-KEEP_DATES);
          return { ...j, [id]: { ...j[id], cooked: (j[id]?.cooked ?? 0) + 1, last: today, dates } };
        }),
      exclude,
      toggleExclude: (tag) => setExclude((e) => (e.includes(tag) ? e.filter((t) => t !== tag) : [...e, tag])),
      fresh,
      myRecipes,
      saveMyRecipe: (recipe) => {
        addUserRecipe(recipe);
        setMyRecipes((list) => (list.some((r) => r.id === recipe.id) ? list.map((r) => (r.id === recipe.id ? recipe : r)) : [recipe, ...list]));
      },
      deleteMyRecipe: (id) => {
        // Сначала убираем ссылки на рецепт из всех списков, потом сам рецепт.
        setDay((d) => d.filter((x) => x.id !== id));
        setShopping((s) => ({ ...s, items: s.items.filter((x) => x.id !== id) }));
        setWeekState((w) => w.map((items) => items.filter((x) => x.id !== id)));
        setFavorites((f) => {
          const next = new Set(f);
          next.delete(id);
          return next;
        });
        setMyRecipes((list) => list.filter((r) => r.id !== id));
        removeUserRecipe(id);
      },
      dislikes,
      toggleDislike: (ingredientId) =>
        setDislikes((d) => (d.includes(ingredientId) ? d.filter((x) => x !== ingredientId) : [...d, ingredientId])),
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
      history,
      week,
      addToWeek: (d, id, servings = 1) => setWeekState((w) => w.map((items, j) => (j === d ? [...items, { id, servings }] : items))),
      removeFromWeek: (d, index) => setWeekState((w) => w.map((items, j) => (j === d ? items.filter((_, k) => k !== index) : items))),
      setWeek: (days) => setWeekState(Array.from({ length: 7 }, (_, d) => days[d] ?? [])),
      clearWeek: () => setWeekState(Array.from({ length: 7 }, () => [])),
      servingFor: (recipeId) =>
        swaps[recipeId]?.length ? perServing(applySwaps(recipeMap[recipeId], swaps[recipeId]), ingredientMap) : servingMacros[recipeId],
    }),
    [favorites, toggleFavorite, day, foods, lastDay, addToDay, goal, shopping, toast, showToast, journal, exclude, fresh, myRecipes, dislikes, pantry, proteinGoal, swaps, week, history],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore вне StoreProvider");
  return s;
}
