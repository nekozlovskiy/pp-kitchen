import type { Recipe } from "../types";
import { collectionMap } from "./collections";

export type Stamp = { id: string; title: string; hint: string; symbol: string; value: number; target: number; done: boolean };

/** Штампы выводятся из факта приготовления, включая старые записи без списка дат. */
export function passportStamps(journal: Record<string, { cooked?: number } | undefined>, list: Recipe[]): Stamp[] {
  const cooked = list.filter((r) => (journal[r.id]?.cooked ?? 0) > 0);
  const count = (test: (r: Recipe) => boolean) => cooked.filter(test).length;
  const stamp = (id: string, title: string, hint: string, symbol: string, value: number, target = 1): Stamp =>
    ({ id, title, hint, symbol, value: Math.min(value, target), target, done: value >= target });
  return [
    stamp("first", "Начало путешествия", "Приготовить первое блюдо", "✦", cooked.length),
    stamp("soup", "Ложка тепла", "Приготовить первый суп", "♨", count((r) => collectionMap.soups.test(r, { macros: { kcal: 0, p: 0, f: 0, c: 0 } }))),
    stamp("breakfasts", "Утро бывает разным", "Приготовить 5 разных завтраков", "☀", count((r) => r.category === "breakfast"), 5),
    stamp("baking", "Из духовки с любовью", "Испечь хлеб, пирог, печенье или кексы", "❋", count((r) => ["bread", "pie", "cookies", "muffin", "cake"].includes(r.art) && r.steps.some((s) => /духовк|выпека|выпечь/i.test(s)))),
    stamp("dinner", "Вечер удался", "Приготовить 3 разных ужина", "☾", count((r) => r.category === "dinner"), 3),
    stamp("sweet", "Сладкая страница", "Приготовить первый десерт", "♡", count((r) => r.category === "dessert")),
    stamp("categories", "На любой случай", "Приготовить блюдо из каждого из 5 разделов", "✿", new Set(cooked.map((r) => r.category)).size, 5),
    stamp("discoveries", "Вкус к открытиям", "Приготовить 10 разных блюд", "✧", cooked.length, 10),
  ];
}
