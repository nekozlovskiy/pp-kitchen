import ingredientsJson from "./ingredients.json";
import recipesJson from "./recipes.json";
import sourcesJson from "./sources.json";
import type { Category, Ingredient, Recipe, Source } from "../types";
import { dishWeight, per100g, perServing } from "../lib/nutrition";

export const ingredients = ingredientsJson as Ingredient[];
export const ingredientMap: Record<string, Ingredient> = Object.fromEntries(
  ingredients.map((i) => [i.id, i]),
);
export const recipes = recipesJson as Recipe[];
export const recipeMap: Record<string, Recipe> = Object.fromEntries(recipes.map((r) => [r.id, r]));

/** Старые адреса рецептов, убранных как дубли: ссылка ведёт на оставшийся рецепт. */
export const recipeAliases: Record<string, string> = {
  "gs-pp-curd-bake-berries": "gs-cottage-berry-souffle-bake",
  "gs-pp-zucchini-fritters": "gs-zucchini-oat-fritters",
};
export const sources = sourcesJson as Record<string, Source>;

// Посчитанные один раз КБЖУ на порцию, чтобы не пересчитывать в каждом рендере.
export const servingMacros = Object.fromEntries(
  recipes.map((r) => [r.id, perServing(r, ingredientMap)]),
);

// КБЖУ на 100 г готового блюда: вес оценивается с приваром круп и ужаркой мяса.
export const per100Macros = Object.fromEntries(recipes.map((r) => [r.id, per100g(r, ingredientMap)]));

/** Примерный вес одной порции готового блюда, округлённый до 10 г. */
export const portionGrams: Record<string, number> = Object.fromEntries(
  recipes.map((r) => [r.id, Math.max(10, Math.round(dishWeight(r) / Math.max(1, r.servings) / 10) * 10)]),
);

/**
 * Свои рецепты Анюты: живут только в её браузере. Их дописываем в общие таблицы (поиск по id, КБЖУ, вес порции),
 * чтобы «Мой день», покупки и меню работали с ними как с обычными, но в каталог `recipes` не добавляем.
 */
export const userRecipeIds = new Set<string>();

export function addUserRecipe(r: Recipe): void {
  userRecipeIds.add(r.id);
  recipeMap[r.id] = r;
  servingMacros[r.id] = perServing(r, ingredientMap);
  per100Macros[r.id] = per100g(r, ingredientMap);
  portionGrams[r.id] = Math.max(10, Math.round(dishWeight(r) / Math.max(1, r.servings) / 10) * 10);
}

export function removeUserRecipe(id: string): void {
  if (!userRecipeIds.delete(id)) return;
  delete recipeMap[id];
  delete servingMacros[id];
  delete per100Macros[id];
  delete portionGrams[id];
}

/** Белковое блюдо: от 10 г белка на каждые 100 ккал. */
export const isProteinDense = (id: string) => {
  const m = servingMacros[id];
  return m.kcal > 0 && (m.p / m.kcal) * 100 >= 10;
};

export const categories: { id: Category; label: string; plural: string }[] = [
  { id: "breakfast", label: "Завтрак", plural: "Завтраки" },
  { id: "lunch", label: "Обед", plural: "Обеды" },
  { id: "dinner", label: "Ужин", plural: "Ужины" },
  { id: "snack", label: "Перекус", plural: "Перекусы" },
  { id: "dessert", label: "Десерт", plural: "Десерты" },
];

export const categoryLabel = Object.fromEntries(categories.map((c) => [c.id, c.label])) as Record<
  Category,
  string
>;
