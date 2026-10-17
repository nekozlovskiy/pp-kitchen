import { ingredientMap, recipeMap } from "../data";
import { scaleIngredients } from "./nutrition";

export type ShoppingLine = { id: string; name: string; grams: number };

/** Сводный список: граммы одинаковых продуктов из разных рецептов складываются. */
export function buildShoppingList(items: { id: string; servings: number }[]) {
  const sums = new Map<string, number>();
  const extras = new Set<string>();
  for (const it of items) {
    const r = recipeMap[it.id];
    if (!r) continue;
    for (const ing of scaleIngredients(r, it.servings)) sums.set(ing.id, (sums.get(ing.id) ?? 0) + ing.grams);
    // «Соль, чёрный перец» → «соль» и «чёрный перец», чтобы не было повторов
    for (const e of r.extras ?? [])
      for (const part of e.name.split(",")) {
        const name = part.trim().toLowerCase();
        if (name) extras.add(name);
      }
  }
  const lines: ShoppingLine[] = [...sums]
    .map(([id, grams]) => ({ id, name: ingredientMap[id]?.name ?? id, grams }))
    .sort((a, b) => a.name.localeCompare(b.name, "ru"));
  return { lines, extras: [...extras].sort((a, b) => a.localeCompare(b, "ru")) };
}
