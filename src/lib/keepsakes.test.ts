import { describe, expect, it } from "vitest";
import { recipes } from "../data";
import { cleanCoupleLikes, cleanMemories, toggleCoupleLike } from "./keepsakes";
import { passportStamps } from "./passport";
import { dinnerPool, pickDinner } from "./surprise";

const r = recipes[0];
describe("личные подборки", () => {
  it("проверяет флаги и неизвестные id", () => {
    expect(cleanCoupleLikes(null)).toEqual({});
    expect(cleanCoupleLikes({ missing: { anya: true }, [r.id]: { anya: true, danya: "yes" } })).toEqual({ [r.id]: { anya: true, danya: false } });
  });
  it("независимо переключает две отметки", () => {
    const first = toggleCoupleLike({}, r.id, "anya");
    const both = toggleCoupleLike(first, r.id, "danya");
    expect(both[r.id]).toEqual({ anya: true, danya: true });
    expect(toggleCoupleLike(both, r.id, "anya")[r.id]).toEqual({ anya: false, danya: true });
    expect(first[r.id]).toEqual({ anya: true, danya: false });
  });
});
describe("воспоминания", () => {
  it("сохраняет несколько вечеров одного блюда, удаляет дубли id и неверные даты", () => {
    const memory = { id: "m1", recipeId: r.id, date: "2026-11-16", caption: "Воскресенье", photo: 123 };
    expect(cleanMemories([memory, memory, { ...memory, id: "m2" }, { ...memory, id: "m3", date: "2026-02-30" }, null])).toEqual([memory, { ...memory, id: "m2" }]);
    expect(cleanMemories({})).toEqual([]);
  });
  it("оставляет воспоминание при удалённом личном рецепте", () => {
    expect(cleanMemories([{ id: "m1", recipeId: "deleted", date: "2026-11-16", caption: "Ужин" }])).toHaveLength(1);
  });
});
describe("паспорт", () => {
  it("учитывает старую историю и считает разные завтраки, а не повторы", () => {
    const breakfasts = recipes.filter((x) => x.category === "breakfast").slice(0, 5);
    const journal = Object.fromEntries(breakfasts.map((x) => [x.id, { cooked: 1, last: "2026-01-01" }]));
    expect(passportStamps(journal, recipes).find((x) => x.id === "breakfasts")?.done).toBe(true);
    expect(passportStamps({ [breakfasts[0].id]: { cooked: 50 } }, recipes).find((x) => x.id === "breakfasts")?.value).toBe(1);
    expect(passportStamps({ missing: { cooked: 1 } }, recipes).some((x) => x.done)).toBe(false);
  });
});
describe("ужин-сюрприз", () => {
  it("учитывает время, все выбранные продукты, ограничения и нелюбимое", () => {
    const dinner = recipes.find((x) => x.category === "dinner")!;
    const products = dinner.ingredients.slice(0, 2).map((x) => x.id);
    expect(dinnerPool([dinner], [], [], dinner.timeMinutes, products)).toEqual([dinner]);
    expect(dinnerPool([dinner], [], [], dinner.timeMinutes - 1, [])).toEqual([]);
    expect(dinnerPool([dinner], [], [products[0]], 999, [])).toEqual([]);
    expect(dinnerPool([dinner], [], [], 999, ["unknown"])).toEqual([]);
    expect(dinnerPool(recipes, ["meat", "fish", "egg", "dairy", "gluten"], [], 999, []).every((x) => x.ingredients.every((i) => !["chicken", "egg", "milk"].includes(i.id)))).toBe(true);
  });
  it("не повторяет предыдущий выбор, если есть другие, и обрабатывает пустой список", () => {
    expect(pickDinner([], null)).toBeNull();
    expect(pickDinner(recipes.slice(0, 2), recipes[0].id, () => 0)?.id).toBe(recipes[1].id);
    expect(pickDinner([r], r.id)?.id).toBe(r.id);
  });
});
