import ingredientsJson from "./ingredients.json";
import recipesJson from "./recipes.json";
import type { Category, Ingredient, Recipe } from "../types";
import { perServing } from "../lib/nutrition";

export const ingredients = ingredientsJson as Ingredient[];
export const ingredientMap: Record<string, Ingredient> = Object.fromEntries(
  ingredients.map((i) => [i.id, i]),
);
export const recipes = recipesJson as Recipe[];
export const recipeMap: Record<string, Recipe> = Object.fromEntries(recipes.map((r) => [r.id, r]));

// Посчитанные один раз КБЖУ на порцию, чтобы не пересчитывать в каждом рендере.
export const servingMacros = Object.fromEntries(
  recipes.map((r) => [r.id, perServing(r, ingredientMap)]),
);

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
