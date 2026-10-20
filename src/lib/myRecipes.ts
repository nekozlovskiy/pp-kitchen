import { ingredientMap } from "../data";
import type { ArtKind, Category, Recipe } from "../types";

/** Картинка для своего рецепта по разделу меню. */
const ART: Record<Category, ArtKind> = { breakfast: "bowl", lunch: "plate", dinner: "plate", snack: "salad", dessert: "cakeslice" };
const CATEGORIES = new Set<Category>(["breakfast", "lunch", "dinner", "snack", "dessert"]);

export const isMyRecipe = (id: string) => id.startsWith("my-");

export type MyRecipeDraft = {
  id?: string;
  title: string;
  category: Category;
  servings: number;
  timeMinutes: number;
  description: string;
  ingredients: { id: string; grams: number }[];
  steps: string[];
};

/** Собирает рецепт из черновика редактора: чистит пустые строки и продукты, которых нет в таблице. */
export function makeMyRecipe(d: MyRecipeDraft, now = Date.now()): Recipe {
  const category = CATEGORIES.has(d.category) ? d.category : "dinner";
  return {
    id: d.id && isMyRecipe(d.id) ? d.id : `my-${now.toString(36)}`,
    category,
    title: d.title.trim(),
    description: d.description.trim(),
    timeMinutes: Math.max(1, Math.round(d.timeMinutes) || 30),
    level: "Легко",
    servings: Math.min(20, Math.max(1, Math.round(d.servings) || 1)),
    ingredients: d.ingredients.filter((i) => ingredientMap[i.id] && i.grams > 0).map((i) => ({ id: i.id, grams: Math.round(i.grams) })),
    steps: d.steps.map((s) => s.trim()).filter(Boolean),
    art: ART[category],
    source: "my",
  };
}

/** Чего не хватает, чтобы сохранить; пустая строка — всё в порядке. */
export function draftProblem(d: MyRecipeDraft): string {
  if (!d.title.trim()) return "Напишите название";
  if (!d.ingredients.some((i) => ingredientMap[i.id] && i.grams > 0)) return "Добавьте хотя бы один продукт с весом";
  if (!d.steps.some((s) => s.trim())) return "Опишите хотя бы один шаг";
  return "";
}

/** Проверка сохранённого: только свои id, известные продукты, непустые название и шаги. */
export function cleanMyRecipes(raw: unknown): Recipe[] {
  if (!Array.isArray(raw)) return [];
  const out: Recipe[] = [];
  for (const r of raw as Partial<Recipe>[]) {
    if (!r || typeof r.id !== "string" || !isMyRecipe(r.id) || typeof r.title !== "string") continue;
    const recipe = makeMyRecipe({
      id: r.id,
      title: r.title,
      category: r.category as Category,
      servings: Number(r.servings),
      timeMinutes: Number(r.timeMinutes),
      description: typeof r.description === "string" ? r.description : "",
      ingredients: Array.isArray(r.ingredients) ? r.ingredients.filter((i) => i && typeof i.id === "string").map((i) => ({ id: i.id, grams: Number(i.grams) })) : [],
      steps: Array.isArray(r.steps) ? r.steps.filter((s): s is string => typeof s === "string") : [],
    });
    if (recipe.title && recipe.ingredients.length && recipe.steps.length) out.push(recipe);
  }
  return out;
}
