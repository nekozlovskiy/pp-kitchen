import { describe, expect, it } from "vitest";
import { recipeMap } from "../data";
import { buildShoppingList } from "./shopping";

describe("список покупок", () => {
  it("складывает граммы одного продукта из разных рецептов", () => {
    // в обоих рецептах есть яйцо
    const a = recipeMap["ovsyanoblin"];
    const b = recipeMap["omelet-broccoli"];
    const eggA = a.ingredients.find((i) => i.id === "egg")!.grams / a.servings;
    const eggB = b.ingredients.find((i) => i.id === "egg")!.grams / b.servings;
    const { lines } = buildShoppingList([
      { id: a.id, servings: 2 },
      { id: b.id, servings: 1 },
    ]);
    expect(lines.find((l) => l.id === "egg")!.grams).toBeCloseTo(eggA * 2 + eggB, 5);
  });

  it("собирает «по вкусу» без повторов и пропускает неизвестные рецепты", () => {
    const { lines, extras } = buildShoppingList([
      { id: "pp-kartoshka", servings: 8 },
      { id: "нет-такого", servings: 1 },
    ]);
    expect(lines.length).toBeGreaterThan(0);
    expect(new Set(extras).size).toBe(extras.length);
  });

  it("пустой список", () => {
    expect(buildShoppingList([])).toEqual({ lines: [], extras: [] });
  });
});
