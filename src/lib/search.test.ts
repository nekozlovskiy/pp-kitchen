import { describe, expect, it } from "vitest";
import { ingredientMap, recipes } from "../data";
import { matches, searchText, stem } from "./search";

const find = (q: string) =>
  recipes.filter((r) => matches(searchText(r, ingredientMap), q)).map((r) => r.id);

describe("поиск", () => {
  it("основа слова", () => {
    expect(stem("курица")).toBe("кури");
    expect(stem("Ёжик")).toBe("ежик");
  });

  it("«курица» находит блюда с куриной грудкой, но не всё, где есть яйцо", () => {
    const res = find("курица");
    expect(res).toContain("shawarma-lettuce");
    expect(res).not.toContain("rice-syrniki-oven");
  });

  it("ищет с начала слова", () => {
    expect(matches("рисовая мука", "рис")).toBe(true);
    expect(matches("зира, барбарис", "рис")).toBe(false);
  });

  it("понимает формы слов", () => {
    expect(find("творога")).toContain("rice-syrniki-oven");
    expect(find("яблоки")).toContain("pp-charlotte");
    expect(find("индейку")).toContain("chopped-turkey-cutlets");
  });

  it("прощает опечатки в длинных словах, но не в коротких", () => {
    expect(find("броколи").length).toBeGreaterThan(0);
    expect(find("броколи")).toEqual(find("брокколи"));
    expect(find("сырнички").length).toBeGreaterThan(0);
    expect(find("кабочок")).toEqual(find("кабачок"));
    expect(matches("манты с тыквой", "манго")).toBe(false);
  });

  it("понимает синонимы и разделы меню", () => {
    expect(find("цукини").length).toBeGreaterThanOrEqual(find("кабачок").length);
    expect(find("картошка")).toEqual(find("картофель"));
    const breakfasts = find("завтрак");
    expect(breakfasts.length).toBeGreaterThan(50);
    for (const id of breakfasts) {
      const r = recipes.find((x) => x.id === id)!;
      expect(r.category === "breakfast" || /завтрак/i.test(`${r.title} ${r.description}`), id).toBe(true);
    }
  });

  it("несколько слов сужают выдачу", () => {
    const res = find("суп треска");
    expect(res).toContain("cod-soup");
    expect(res).not.toContain("mushroom-cream-soup");
  });
});
