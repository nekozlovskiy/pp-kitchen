import { describe, expect, it } from "vitest";
import { recipes, recipeMap } from "../data";
import { fitsDiet } from "./diet";
import { dailyRecipe } from "./daily";

const date = new Date(2026, 10, 6, 12);
describe("рецепт дня", () => {
  it("остаётся тем же в течение календарного дня", () => {
    expect(dailyRecipe(recipes, [], [], date)?.id).toBe(dailyRecipe(recipes, [], [], new Date(2026, 10, 6, 23, 59))?.id);
  });
  it("учитывает пищевые исключения и нелюбимые продукты", () => {
    const r = dailyRecipe(recipes, ["meat", "fish", "egg"], ["onion"], date);
    expect(r).toBeDefined();
    expect(fitsDiet(r!, ["meat", "fish", "egg"], ["onion"])).toBe(true);
    expect(dailyRecipe([recipeMap["omelet-cottage"]], ["egg"], [], date)).toBeUndefined();
  });
  it("не выбирает запрещённое блюдо, даже если подходящих нет", () => {
    expect(dailyRecipe([], [], [], date)).toBeUndefined();
    expect(dailyRecipe([recipeMap["chicken-mushrooms-oven"]], [], ["chicken"], date)).toBeUndefined();
  });
});
