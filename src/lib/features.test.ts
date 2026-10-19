import { describe, expect, it } from "vitest";
import { ingredientMap, recipeMap, recipes, servingMacros } from "../data";
import { dietIngredients, fitsDiet } from "./diet";
import { formatClock, splitStep } from "./steptime";
import { missingFor, pantryMatches } from "./pantry";
import { buildMenu } from "./menu";

const timers = (s: string) => splitStep(s).filter((p) => p.seconds).map((p) => [p.text, p.seconds]);

describe("таймеры в шагах", () => {
  it("находит минуты, берёт нижнюю границу диапазона", () => {
    expect(timers("Запекайте при 180 °C 25–30 минут.")).toEqual([["25–30 минут", 1500]]);
    expect(timers("Жарьте 1,5–2 минуты, затем ещё 1 мин")).toEqual([
      ["1,5–2 минуты", 90],
      ["1 мин", 60],
    ]);
  });

  it("понимает секунды, часы, «полчаса» и «на час»", () => {
    expect(timers("Прогрейте 30–40 секунд")).toEqual([["30–40 секунд", 30]]);
    expect(timers("Охладите 2–3 часа")).toEqual([["2–3 часа", 7200]]);
    expect(timers("Дайте настояться полчаса")).toEqual([["полчаса", 1800]]);
    expect(timers("Уберите в холодильник на час")).toEqual([["час", 3600]]);
  });

  it("не путает время с сантиметрами и частями", () => {
    expect(timers("Слоем 1,5–2 см, разделите на 6–8 частей")).toEqual([]);
  });

  it("склеивает части обратно в исходный текст", () => {
    for (const r of recipes)
      for (const s of r.steps) expect(splitStep(s).map((p) => p.text).join("")).toBe(s);
  });

  it("форматирует обратный отсчёт", () => {
    expect(formatClock(1500)).toBe("25:00");
    expect(formatClock(59.2)).toBe("1:00");
    expect(formatClock(3905)).toBe("1:05:05");
  });
});

describe("ограничения в еде", () => {
  it("списки ссылаются только на существующие продукты", () => {
    for (const ids of Object.values(dietIngredients)) for (const id of ids) expect(ingredientMap[id], id).toBeDefined();
  });

  it("исключает рецепты с запрещёнными продуктами", () => {
    expect(fitsDiet(recipeMap["omelet-cottage"], ["egg"])).toBe(false);
    expect(fitsDiet(recipeMap["omelet-cottage"], ["fish", "meat"])).toBe(true);
    expect(fitsDiet(recipeMap["pp-caesar"], ["meat"])).toBe(false);
  });
});

describe("из того, что есть", () => {
  it("не требует масла и считает недостающее", () => {
    const r = recipeMap["chicken-quinoa-broccoli"];
    expect(missingFor(r, new Set(["chicken", "quinoa", "broccoli", "soy_sauce"]))).toEqual([]);
    expect(missingFor(r, new Set(["chicken", "quinoa"]))).toEqual(["broccoli", "soy_sauce"]);
  });

  it("сортирует: сначала то, для чего всё есть", () => {
    const found = pantryMatches(recipes, new Set(["egg", "cottage5", "milk", "chicken", "zucchini", "soy_sauce"]));
    expect(found.length).toBeGreaterThan(0);
    expect(found[0].missing).toEqual([]);
    for (let i = 1; i < found.length; i++) expect(found[i].missing.length).toBeGreaterThanOrEqual(found[i - 1].missing.length);
  });
});

describe("меню на день", () => {
  it("попадает в цель по калориям и белку", () => {
    const menu = buildMenu(recipes, servingMacros, { kcal: 1600, minProtein: 100, seed: 7 })!;
    expect(menu.slots.map((s) => s.recipe.category)).toEqual(
      expect.arrayContaining(["breakfast", "lunch", "dinner"]),
    );
    expect(Math.abs(menu.total.kcal - 1600)).toBeLessThan(40);
    expect(Math.round(menu.total.p)).toBeGreaterThanOrEqual(100);
  });

  it("для большой цели добирает порциями, а не промахивается", () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const menu = buildMenu(recipes, servingMacros, { kcal: 2200, minProtein: 120, seed })!;
      expect(Math.abs(menu.total.kcal - 2200), `seed ${seed}`).toBeLessThan(60);
      for (const s of menu.slots) expect([1, 1.5, 2]).toContain(s.servings);
    }
  });

  it("одинаковый seed — одинаковое меню, другой — другое", () => {
    const a = buildMenu(recipes, servingMacros, { kcal: 1800, minProtein: 90, seed: 1 })!;
    const b = buildMenu(recipes, servingMacros, { kcal: 1800, minProtein: 90, seed: 1 })!;
    const c = buildMenu(recipes, servingMacros, { kcal: 1800, minProtein: 90, seed: 2 })!;
    expect(a.slots.map((s) => s.recipe.id)).toEqual(b.slots.map((s) => s.recipe.id));
    expect(a.slots.map((s) => s.recipe.id)).not.toEqual(c.slots.map((s) => s.recipe.id));
  });
});
