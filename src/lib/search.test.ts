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
    expect(res).toContain("caesar");
    expect(res).not.toContain("syrniki");
  });

  it("ищет с начала слова", () => {
    expect(matches("рисовая мука", "рис")).toBe(true);
    expect(matches("зира, барбарис", "рис")).toBe(false);
  });

  it("понимает формы слов", () => {
    expect(find("творога")).toContain("syrniki");
    expect(find("яблоки")).toContain("pp-charlotte");
    expect(find("индейку")).toContain("turkey-plov");
  });

  it("несколько слов сужают выдачу", () => {
    const res = find("суп тыква");
    expect(res).toContain("pumpkin-soup");
    expect(res).not.toContain("borscht");
  });
});
