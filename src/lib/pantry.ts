import type { Recipe } from "../types";

/** Масло почти всегда есть дома, поэтому по умолчанию его не требуем. */
export const staples = ["olive_oil", "veg_oil", "sesame_oil", "coconut_oil"];

export type PantryMatch = { recipe: Recipe; missing: string[]; have: number };

/** Чего не хватает для рецепта, если дома есть продукты `have`. */
export function missingFor(recipe: Recipe, have: ReadonlySet<string>, assumeStaples = true): string[] {
  return recipe.ingredients
    .map((i) => i.id)
    .filter((id) => !have.has(id) && !(assumeStaples && staples.includes(id)));
}

/**
 * Рецепты, которые можно приготовить, докупив не больше `maxMissing` продуктов.
 * Сначала те, где ничего не нужно, затем где совпало больше продуктов из дома.
 */
export function pantryMatches(
  recipes: readonly Recipe[],
  have: ReadonlySet<string>,
  { maxMissing = 2, assumeStaples = true } = {},
): PantryMatch[] {
  if (have.size === 0) return [];
  return recipes
    .map((recipe) => {
      const missing = missingFor(recipe, have, assumeStaples);
      // Совпадением считаем только выбранные продукты: масло «по умолчанию» само рецепт не подбирает.
      return { recipe, missing, have: recipe.ingredients.filter((i) => have.has(i.id)).length };
    })
    .filter((m) => m.missing.length <= maxMissing && m.have > 0)
    .sort((a, b) => a.missing.length - b.missing.length || b.have - a.have);
}
