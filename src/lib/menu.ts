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

/** Меню считается подходящим, если калории отличаются от цели не больше чем на 1,5% и белок добран. */
const GOOD_ENOUGH = 0.015;

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
 * по калориям и белка было не меньше `minProtein`. Перебирает случайные сочетания;
 * среди подходящих сочетаний выбирает случайное (избранное — чуть чаще).
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
  type Pick = { picks: Recipe[]; sizes: number[]; score: number };
  let best: Pick | null = null;
  // Все сочетания, которые укладываются в цель: из них выбираем случайно, а не самое точное,
  // иначе одно и то же блюдо (особенно избранное) попадает почти в каждое меню.
  const good: Pick[] = [];
  for (let t = 0; t < tries; t++) {
    const picks = pools.map((p) => p[Math.floor(rand() * p.length)]);
    const sizes = picks.map(() => portions[Math.floor(rand() * portions.length)]);
    const k = picks.reduce((a, r, i) => a + macros[r.id].kcal * sizes[i], 0);
    const p = picks.reduce((a, r, i) => a + macros[r.id].p * sizes[i], 0);
    const extra = sizes.reduce((a, s) => a + s - 1, 0);
    const score = Math.abs(k - kcal) / kcal + (1.5 * Math.max(0, minProtein - p)) / minProtein + 0.005 * extra;
    const pick = { picks, sizes, score };
    if (!best || score < best.score) best = pick;
    if (score <= GOOD_ENOUGH) good.push(pick);
  }
  // Избранное чуть вероятнее, но без гарантии места.
  const weight = (x: Pick) => 1 + 0.5 * x.picks.filter((r) => favorites.has(r.id)).length;
  let chosen = best!;
  if (good.length > 0) {
    let r = rand() * good.reduce((a, x) => a + weight(x), 0);
    chosen = good.find((x) => (r -= weight(x)) < 0) ?? good[good.length - 1];
  }
  const { picks, sizes } = chosen;
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
