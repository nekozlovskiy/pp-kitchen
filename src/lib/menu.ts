import type { Macros, Recipe } from "../types";

export type MenuSlot = { label: string; recipe: Recipe; servings: number };

/** Сколько порций можно взять на приём пищи: одна, полторы или две. */
const portions = [1, 1, 1.5, 2];
export type Menu = { slots: MenuSlot[]; total: Macros };

/** Приёмы пищи и из каких разделов каталога их брать. */
const slots: { label: string; from: Recipe["category"][] }[] = [
  { label: "Завтрак", from: ["breakfast"] },
  { label: "Обед", from: ["lunch"] },
  { label: "Ужин", from: ["dinner"] },
  { label: "Перекус", from: ["snack", "dessert"] },
];

/** Детерминированный генератор случайных чисел: одинаковый seed — одинаковое меню. */
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

/**
 * Подбирает блюдо и число порций (1–2) на каждый приём пищи так, чтобы сумма была близка к цели
 * по калориям и белка было не меньше `minProtein`. Перебирает случайные сочетания и берёт лучшее;
 * при равенстве предпочитает одну порцию и избранное.
 */
export function buildMenu(
  recipes: readonly Recipe[],
  macros: Record<string, Macros>,
  { kcal, minProtein, seed, favorites = new Set<string>(), tries = 4000 }: {
    kcal: number;
    minProtein: number;
    seed: number;
    favorites?: ReadonlySet<string>;
    tries?: number;
  },
): Menu | null {
  const pools = slots.map((s) => recipes.filter((r) => s.from.includes(r.category)));
  if (pools.some((p) => p.length === 0)) return null;
  const rand = rng(seed);
  let best: { picks: Recipe[]; sizes: number[]; score: number } | null = null;
  for (let t = 0; t < tries; t++) {
    const picks = pools.map((p) => p[Math.floor(rand() * p.length)]);
    const sizes = picks.map(() => portions[Math.floor(rand() * portions.length)]);
    const k = picks.reduce((a, r, i) => a + macros[r.id].kcal * sizes[i], 0);
    const p = picks.reduce((a, r, i) => a + macros[r.id].p * sizes[i], 0);
    const fav = picks.filter((r) => favorites.has(r.id)).length;
    const extra = sizes.reduce((a, s) => a + s - 1, 0);
    const score =
      Math.abs(k - kcal) / kcal + (1.5 * Math.max(0, minProtein - p)) / minProtein - 0.01 * fav + 0.005 * extra;
    if (!best || score < best.score) best = { picks, sizes, score };
  }
  const { picks, sizes } = best!;
  const total = picks.reduce<Macros>(
    (a, r, i) => ({
      kcal: a.kcal + macros[r.id].kcal * sizes[i],
      p: a.p + macros[r.id].p * sizes[i],
      f: a.f + macros[r.id].f * sizes[i],
      c: a.c + macros[r.id].c * sizes[i],
    }),
    { kcal: 0, p: 0, f: 0, c: 0 },
  );
  return { slots: slots.map((s, i) => ({ label: s.label, recipe: picks[i], servings: sizes[i] })), total };
}
