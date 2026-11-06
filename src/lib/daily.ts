import type { Recipe } from "../types";
import { fitsDiet } from "./diet";
import type { DietTag } from "./diet";

/** Один рецепт на местный календарный день, только из подходящих по предпочтениям. */
export function dailyRecipe(recipes: readonly Recipe[], exclude: DietTag[] = [], dislikes: string[] = [], date = new Date()): Recipe | undefined {
  const pool = recipes.filter((r) => fitsDiet(r, exclude, dislikes));
  if (!pool.length) return undefined;
  const days = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
  return pool[((days * 37) % pool.length + pool.length) % pool.length];
}
