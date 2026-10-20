import { categories, isProteinDense, recipeMap, servingMacros } from "../data";
import { collectionMap } from "./collections";
import type { Category } from "../types";

/** Нужная часть личных отметок к рецепту. */
type Entry = { cooked?: number; last?: string; rating?: number; photo?: number; dates?: string[] };
type Journal = Record<string, Entry | undefined>;

export type CookEvent = { id: string; date: string };

/** Лента готовки: каждая отмеченная дата, новые сверху. До появления списка дат известна только последняя. */
export function cookEvents(journal: Journal): CookEvent[] {
  const out: CookEvent[] = [];
  for (const [id, e] of Object.entries(journal)) {
    if (!e?.cooked || !recipeMap[id]) continue;
    const dates = e.dates?.length ? e.dates : e.last ? [e.last] : [];
    for (const date of dates) out.push({ id, date });
  }
  return out.sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
}

export type Achievement = { id: string; title: string; hint: string; value: number; target: number; done: boolean };

export function kitchenStats(journal: Journal, today = new Date()) {
  const cooked = Object.entries(journal).filter(([id, e]) => (e?.cooked ?? 0) > 0 && recipeMap[id]);
  const ids = cooked.map(([id]) => id);
  const total = cooked.reduce((a, [, e]) => a + (e?.cooked ?? 0), 0);
  const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const thisMonth = cookEvents(journal).filter((e) => e.date.startsWith(month)).length;

  const byCategory = new Map<Category, number>();
  for (const [id, e] of cooked) byCategory.set(recipeMap[id].category, (byCategory.get(recipeMap[id].category) ?? 0) + (e?.cooked ?? 0));
  const top = [...byCategory].sort((a, b) => b[1] - a[1])[0]?.[0];
  const topCategory = top ? categories.find((c) => c.id === top)!.plural : null;

  const count = (test: (id: string) => boolean) => ids.filter(test).length;
  const soups = count((id) => collectionMap.soups.test(recipeMap[id], { macros: servingMacros[id] }));
  const protein = count(isProteinDense);
  const desserts = count((id) => recipeMap[id].category === "dessert");
  const photos = Object.values(journal).filter((e) => e?.photo).length;
  const rated = Object.values(journal).filter((e) => e?.rating).length;

  const a = (id: string, title: string, hint: string, value: number, target: number): Achievement => ({
    id,
    title,
    hint,
    value: Math.min(value, target),
    target,
    done: value >= target,
  });
  const achievements = [
    a("first", "Первое блюдо", "Отметить, что приготовила", total, 1),
    a("ten", "Десяточка", "Приготовить 10 раз", total, 10),
    a("explorer", "Исследовательница", "25 разных блюд", ids.length, 25),
    a("soups", "Королева супов", "5 разных супов", soups, 5),
    a("protein", "Белковая сила", "10 белковых блюд", protein, 10),
    a("sweet", "Сладкое без вины", "5 разных десертов", desserts, 5),
    a("all", "На все случаи", "Завтрак, обед, ужин, перекус и десерт", byCategory.size, categories.length),
    a("photo", "Фуд-фотограф", "5 своих фото блюд", photos, 5),
    a("critic", "Строгий критик", "Оценить 10 рецептов", rated, 10),
    a("fifty", "Полсотни", "Приготовить 50 раз", total, 50),
  ];

  return { total, distinct: ids.length, thisMonth, topCategory, achievements };
}
