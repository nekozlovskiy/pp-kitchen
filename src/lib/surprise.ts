import type { Recipe } from "../types";
import { fitsDiet, type DietTag } from "./diet";

export function dinnerPool(list: Recipe[], exclude: DietTag[], dislikes: string[], maxMinutes: number, products: string[]): Recipe[] {
  return list.filter((r) => r.category === "dinner" && r.timeMinutes <= maxMinutes && fitsDiet(r, exclude, dislikes) &&
    products.every((id) => r.ingredients.some((i) => i.id === id)));
}

export function pickDinner(pool: Recipe[], previous: string | null, random = Math.random): Recipe | null {
  const others = pool.filter((r) => r.id !== previous);
  const choices = others.length ? others : pool;
  return choices.length ? choices[Math.min(choices.length - 1, Math.max(0, Math.floor(random() * choices.length)))] : null;
}

export function dinnerHints(recipe: Recipe): string[] {
  const oven = recipe.steps.some((s) => /духовк|запека|выпека/i.test(s));
  return [oven ? "Будет готовиться в духовке" : recipe.steps.some((s) => /сковород|обжар|жарьте/i.test(s)) ? "Пригодится сковорода" : "Маленькое открытие к ужину",
    `Около ${recipe.timeMinutes} минут${recipe.timeNote ? ` · ${recipe.timeNote}` : ""}`, `Сложность: ${recipe.level}`];
}
