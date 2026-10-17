import { describe, expect, it } from "vitest";
import { ingredientMap, ingredients, recipes, sources } from "../data";
import { macroPercents, perServing, recipeTotals, round, scaleIngredients } from "./nutrition";
import type { Recipe } from "../types";

const sample: Recipe = {
  id: "t",
  category: "lunch",
  title: "Тест",
  description: "",
  timeMinutes: 1,
  level: "Легко",
  servings: 2,
  art: "plate",
  source: "zavtrak",
  ingredients: [
    { id: "chicken", grams: 200 },
    { id: "olive_oil", grams: 10 },
  ],
  steps: [],
};

describe("расчёт КБЖУ", () => {
  it("суммирует продукты по граммам", () => {
    const t = recipeTotals(sample, ingredientMap);
    expect(t.kcal).toBeCloseTo(113 * 2 + 89.8, 5);
    expect(t.p).toBeCloseTo(47.2, 5);
    expect(t.f).toBeCloseTo(3.8 + 9.98, 5);
  });

  it("делит на порции и округляет", () => {
    expect(round(perServing(sample, ingredientMap))).toEqual({ kcal: 158, p: 24, f: 7, c: 0 });
  });

  it("проценты калорий в сумме дают 100", () => {
    const pc = macroPercents({ kcal: 0, p: 10, f: 10, c: 10 });
    expect(pc.p + pc.f + pc.c).toBe(100);
    expect(pc.f).toBeGreaterThan(pc.p);
    expect(macroPercents({ kcal: 0, p: 0, f: 0, c: 0 })).toEqual({ p: 0, f: 0, c: 0 });
  });

  it("пересчитывает граммы под число порций", () => {
    expect(scaleIngredients(sample, 4)).toEqual([
      { id: "chicken", grams: 400 },
      { id: "olive_oil", grams: 20 },
    ]);
  });
});

describe("данные", () => {
  it("каждый продукт сходится с формулой 4·Б + 9·Ж + 4·У (±8%)", () => {
    for (const i of ingredients) {
      if (i.per100.kcal === 0) continue;
      const k = 4 * i.per100.p + 9 * i.per100.f + 4 * i.per100.c;
      expect(Math.abs(k - i.per100.kcal) / i.per100.kcal, i.id).toBeLessThanOrEqual(0.08);
    }
  });

  it("рецепты ссылаются только на существующие продукты, id уникальны", () => {
    const ids = new Set<string>();
    for (const r of recipes) {
      expect(ids.has(r.id), r.id).toBe(false);
      ids.add(r.id);
      for (const i of r.ingredients) expect(ingredientMap[i.id], `${r.id}: ${i.id}`).toBeDefined();
      expect(r.steps.length, r.id).toBeGreaterThan(0);
    }
  });

  it("у каждого рецепта разумная калорийность порции", () => {
    for (const r of recipes) {
      const kcal = perServing(r, ingredientMap).kcal;
      expect(kcal, r.id).toBeGreaterThan(10);
      expect(kcal, r.id).toBeLessThan(700);
    }
  });

  it("у каждого рецепта указан существующий источник", () => {
    for (const r of recipes) expect(sources[r.source], r.id).toBeDefined();
  });
});
