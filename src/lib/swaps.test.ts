import { describe, expect, it } from "vitest";
import { ingredientMap, recipes } from "../data";
import { SWAPS, applySwaps, availableSwaps } from "./swaps";
import { perServing } from "./nutrition";
import type { Recipe } from "../types";

const base: Recipe = {
  id: "t",
  category: "dessert",
  title: "Тест",
  description: "",
  timeMinutes: 1,
  level: "Легко",
  servings: 1,
  art: "cake",
  source: "zavtrak",
  ingredients: [
    { id: "sugar", grams: 50 },
    { id: "honey", grams: 20 },
    { id: "cottage5", grams: 200 },
  ],
  steps: ["шаг"],
};

describe("замены продуктов", () => {
  it("все замены ведут на существующие продукты", () => {
    for (const s of SWAPS) {
      expect(ingredientMap[s.to], s.key).toBeDefined();
      for (const id of s.from) expect(ingredientMap[id], `${s.key}: ${id}`).toBeDefined();
    }
  });

  it("предлагаются только подходящие замены", () => {
    expect(availableSwaps(base).map((s) => s.key)).toEqual(["sugar-sweetener", "cottage-zero"]);
  });

  it("одинаковые продукты после замены складываются, без замен рецепт не меняется", () => {
    expect(applySwaps(base, ["sugar-sweetener"]).ingredients).toEqual([
      { id: "erythritol", grams: 70 },
      { id: "cottage5", grams: 200 },
    ]);
    expect(applySwaps(base, [])).toBe(base);
  });

  it("сахарозаменитель вместо сахара снижает калорийность", () => {
    const before = perServing(base, ingredientMap).kcal;
    const after = perServing(applySwaps(base, ["sugar-sweetener"]), ingredientMap).kcal;
    expect(after).toBeLessThan(before);
  });

  it("у каждого рецепта замены применяются без ошибок", () => {
    for (const r of recipes) {
      const keys = availableSwaps(r).map((s) => s.key);
      expect(applySwaps(r, keys).ingredients.every((i) => ingredientMap[i.id]), r.id).toBe(true);
    }
  });
});
