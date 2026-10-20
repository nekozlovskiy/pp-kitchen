import { describe, expect, it } from "vitest";
import { ingredientMap, recipeMap, recipes, servingMacros } from "../data";
import { dietIngredients, fitsDiet } from "./diet";
import { formatClock, splitStep } from "./steptime";
import { missingFor, pantryMatches } from "./pantry";
import { buildMenu } from "./menu";
import { collections, daysSince, hasProduct, products, seasonCollection } from "./collections";
import { cleanHistory, lastDays, withDay } from "./history";
import { makeSimilar } from "./similar";
import { AISLES, aisleOf, groupByAisle } from "./aisles";
import { freshIds, updateKnown } from "./fresh";
import { cookEvents, kitchenStats } from "./kitchen";
import { cleanMyRecipes, draftProblem, makeMyRecipe } from "./myRecipes";
import { addUserRecipe, removeUserRecipe, userRecipeIds } from "../data";
import { todayKey } from "./format";

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

  it("показывает только рецепты с выбранными продуктами, масло совпадением не считается", () => {
    for (const maxMissing of [2, Infinity]) {
      for (const m of pantryMatches(recipes, new Set(["beef_mince"]), { maxMissing })) {
        expect(m.recipe.ingredients.map((i) => i.id)).toContain("beef_mince");
      }
    }
    const all = pantryMatches(recipes, new Set(["beef_mince"]), { maxMissing: Infinity });
    expect(all.length).toBe(recipes.filter((r) => r.ingredients.some((i) => i.id === "beef_mince")).length);
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

  it("избранное не попадает в каждое меню", () => {
    const favorites = new Set(["salmon-lavash-rolls"]);
    const withFav = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter((seed) =>
      buildMenu(recipes, servingMacros, { kcal: 1600, minProtein: 90, seed, favorites })!.slots.some(
        (s) => s.recipe.id === "salmon-lavash-rolls",
      ),
    );
    expect(withFav.length).toBeLessThan(5);
  });
});

describe("перенос на другое устройство", () => {
  it("код разворачивается обратно без потерь, кириллица сохраняется", async () => {
    const { encodeBundle, decodeBundle } = await import("./transfer");
    const bundle = { v: 1 as const, at: "2026-10-19", data: { "pp.favorites": ["a", "b"], "pp.journal": { a: { note: "Вкусно, но солоно" } } } };
    const code = encodeBundle(bundle);
    expect(code.startsWith("PP1:")).toBe(true);
    expect(decodeBundle(code)).toEqual(bundle);
    expect(decodeBundle(JSON.stringify(bundle))).toEqual(bundle);
  });

  it("чужой текст не принимается", async () => {
    const { decodeBundle } = await import("./transfer");
    expect(decodeBundle("привет")).toBeNull();
    expect(decodeBundle("PP1:@@@")).toBeNull();
    expect(decodeBundle('{"v":2,"data":{}}')).toBeNull();
  });
});

describe("подборки и главный продукт", () => {
  it("все продукты в группах есть в таблице", () => {
    for (const p of products) for (const id of p.ids) expect(ingredientMap[id], `${p.id}: ${id}`).toBeDefined();
  });

  it("каждая группа продуктов и каждая подборка находят рецепты", () => {
    for (const p of products) expect(recipes.some((r) => hasProduct(r, p.id)), p.id).toBe(true);
    for (const c of collections.filter((c) => !["loved", "missed", "new"].includes(c.id))) {
      expect(recipes.some((r) => c.test(r, { macros: servingMacros[r.id] })), c.id).toBe(true);
    }
  });

  it("«На пару» и «Супы» не путаются со словами «на пару секунд» и «в бульоне»", () => {
    const pick = (id: string) => {
      const c = collections.find((c) => c.id === id)!;
      return new Set(recipes.filter((r) => c.test(r, { macros: servingMacros[r.id] })).map((r) => r.id));
    };
    const steamed = pick("steamed");
    expect(steamed.has("gs-steamed-tilapia-cucumber-sauce")).toBe(true);
    expect(steamed.has("gs-fruit-popsicles-no-sugar")).toBe(false);
    const soups = pick("soups");
    expect(soups.has("gs-miso-soup-veg-tofu")).toBe(true);
    expect([...soups].some((id) => /скумбри/i.test(recipes.find((r) => r.id === id)!.title))).toBe(false);
  });

  it("«Без духовки» не берёт рецепты с духовкой, «Любимое» — только по дневнику", () => {
    const noOven = collections.find((c) => c.id === "no-oven")!;
    for (const r of recipes.filter((r) => noOven.test(r, { macros: servingMacros[r.id] }))) {
      expect(r.steps.join(" "), r.id).not.toMatch(/духовк/i);
    }
    const loved = collections.find((c) => c.id === "loved")!;
    const r = recipes[0];
    expect(loved.test(r, { macros: servingMacros[r.id] })).toBe(false);
    expect(loved.test(r, { macros: servingMacros[r.id], journal: { rating: 5 } })).toBe(true);
  });

  it("сезонная подборка своя в каждом сезоне и всегда находит рецепты", () => {
    const ids = [0, 3, 6, 9].map((month) => seasonCollection(new Date(2026, month, 15)));
    expect(ids.map((c) => c.id)).toEqual(["winter", "spring", "summer", "autumn"]);
    expect(seasonCollection(new Date(2026, 11, 1)).id).toBe("winter");
    for (const c of ids) expect(recipes.filter((r) => c.test(r, { macros: servingMacros[r.id] })).length, c.id).toBeGreaterThan(10);
  });

  it("«Давно не готовила» — понравившееся, что не готовили больше месяца", () => {
    const missed = collections.find((c) => c.id === "missed")!;
    const r = recipes[0];
    const ago = (days: number) => {
      const d = new Date();
      d.setDate(d.getDate() - days);
      return todayKey(d);
    };
    expect(daysSince("2026-10-01", new Date(2026, 9, 31))).toBe(30);
    expect(missed.test(r, { macros: servingMacros[r.id], journal: { rating: 5, cooked: 1, last: ago(40) } })).toBe(true);
    expect(missed.test(r, { macros: servingMacros[r.id], journal: { rating: 5, cooked: 1, last: ago(5) } })).toBe(false);
    expect(missed.test(r, { macros: servingMacros[r.id], journal: { rating: 2, cooked: 1, last: ago(40) } })).toBe(false);
    expect(missed.test(r, { macros: servingMacros[r.id], journal: { rating: 5 } })).toBe(false);
  });
});

describe("«Не люблю» и похожие рецепты", () => {
  it("нелюбимый продукт убирает рецепты с ним", () => {
    const withOnion = recipes.filter((r) => r.ingredients.some((i) => i.id === "onion"));
    expect(withOnion.length).toBeGreaterThan(0);
    for (const r of withOnion) expect(fitsDiet(r, [], ["onion"]), r.id).toBe(false);
    expect(fitsDiet(withOnion[0], [])).toBe(true);
  });

  it("похожие: не сам рецепт, не больше четырёх, с общими продуктами и с учётом фильтра", () => {
    const similar = makeSimilar(recipes);
    let empty = 0;
    for (const r of recipes) {
      const list = similar(r);
      if (!list.length) empty++;
      expect(list.length).toBeLessThanOrEqual(4);
      for (const s of list) {
        expect(s.id).not.toBe(r.id);
        expect(s.ingredients.some((i) => r.ingredients.some((j) => j.id === i.id)), `${r.id} → ${s.id}`).toBe(true);
      }
    }
    // Почти у каждого рецепта находится что-то похожее
    expect(empty / recipes.length).toBeLessThan(0.05);
    const fishDish = recipeMap["gs-steamed-tilapia-cucumber-sauce"] ?? recipes[0];
    for (const s of similar(fishDish, 4, (x) => fitsDiet(x, ["fish"]))) expect(fitsDiet(s, ["fish"])).toBe(true);
  });
});

describe("история дней", () => {
  const m = (kcal: number) => ({ kcal, p: 10, f: 5, c: 20 });

  it("хранит 60 последних дней, пустой день убирает", () => {
    let h = {};
    const key = (i: number) => todayKey(new Date(2026, 7, 1 + i));
    for (let i = 0; i < 70; i++) h = withDay(h, key(i), m(1000 + i));
    expect(Object.keys(h)).toHaveLength(60);
    expect(Object.keys(h)[0]).toBe(key(10));
    expect(withDay(h, key(69), m(0))[key(69)]).toBeUndefined();
  });

  it("неделя заканчивается сегодняшним днём, пропуски — null", () => {
    const days = lastDays({ "2026-10-19": m(1500), "2026-10-17": m(1400) }, 7, new Date(2026, 9, 19));
    expect(days.map((d) => d.date)).toEqual(["2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16", "2026-10-17", "2026-10-18", "2026-10-19"]);
    expect(days[4].totals?.kcal).toBe(1400);
    expect(days[5].totals).toBeNull();
  });

  it("чужие данные в хранилище отбрасываются", () => {
    expect(cleanHistory({ "2026-10-19": m(1500), junk: m(1), "2026-10-18": { kcal: "много" } })).toEqual({ "2026-10-19": m(1500) });
    expect(cleanHistory(null)).toEqual({});
  });
});

describe("покупки по отделам", () => {
  it("свежие продукты не уходят в бакалею, отделы идут по порядку", () => {
    expect(aisleOf("tomato")).toBe("Овощи и зелень");
    expect(aisleOf("apple")).toBe("Фрукты и ягоды");
    expect(aisleOf("chicken")).toBe("Мясо и птица");
    expect(aisleOf("salmon")).toBe("Рыба и морепродукты");
    expect(aisleOf("kefir")).toBe("Молочное и сыр");
    expect(aisleOf("egg")).toBe("Яйца");
    expect(aisleOf("buckwheat")).toBe("Крупы, макароны, мука");
    expect(aisleOf("olive_oil")).toBe("Бакалея, соусы и масла");
    const groups = groupByAisle([{ id: "olive_oil" }, { id: "tomato" }, { id: "egg" }]);
    expect(groups.map((g) => g.aisle)).toEqual(["Овощи и зелень", "Яйца", "Бакалея, соусы и масла"]);
  });

  it("у каждого продукта есть отдел, свежие овощи и фрукты не попадают в бакалею", () => {
    for (const ing of Object.values(ingredientMap)) expect(AISLES).toContain(aisleOf(ing.id));
    const fresh = ["Овощи и зелень", "Фрукты и ягоды"];
    for (const id of ["tomato", "cucumber", "carrot", "onion", "potato", "zucchini", "apple", "banana", "berries", "nettle", "quince"])
      expect(fresh, id).toContain(aisleOf(id));
  });
});

describe("«Новое» и «Моя кухня»", () => {
  it("при первом визите ничего не новое, потом новое — то, чего телефон не видел", () => {
    const first = updateKnown(null, ["a", "b"], "2026-10-20");
    expect(freshIds(first, new Date(2026, 9, 20)).size).toBe(0);
    const later = updateKnown(first, ["a", "b", "c"], "2026-10-25");
    expect([...freshIds(later, new Date(2026, 9, 26))]).toEqual(["c"]);
    expect(freshIds(later, new Date(2026, 10, 20)).size).toBe(0);
    expect(updateKnown(later, ["a"], "2026-10-26")).toEqual({ a: "" });
  });

  it("лента и достижения считаются по отметкам", () => {
    const [soup] = recipes.filter((r) => collections.find((c) => c.id === "soups")!.test(r, { macros: servingMacros[r.id] }));
    const other = recipes.find((r) => r.id !== soup.id)!;
    const journal = {
      [soup.id]: { cooked: 2, last: "2026-10-18", dates: ["2026-09-30", "2026-10-18"], rating: 5 },
      [other.id]: { cooked: 1, last: "2026-10-01" },
      "нет-такого": { cooked: 3, last: "2026-10-02" },
    };
    expect(cookEvents(journal).map((e) => e.date)).toEqual(["2026-10-18", "2026-10-01", "2026-09-30"]);
    const s = kitchenStats(journal, new Date(2026, 9, 20));
    expect(s.total).toBe(3);
    expect(s.distinct).toBe(2);
    expect(s.thisMonth).toBe(2);
    const ach = Object.fromEntries(s.achievements.map((a) => [a.id, a]));
    expect(ach.first.done).toBe(true);
    expect(ach.ten.value).toBe(3);
    expect(ach.soups.value).toBeGreaterThanOrEqual(1);
    expect(ach.critic.value).toBe(1);
  });
});

describe("свои рецепты", () => {
  const draft = {
    title: "  Мамины сырники ",
    category: "breakfast" as const,
    servings: 2,
    timeMinutes: 25,
    description: "",
    ingredients: [
      { id: "cottage5", grams: 400 },
      { id: "egg", grams: 55 },
      { id: "нет-такого", grams: 10 },
      { id: "oat_flour", grams: 0 },
    ],
    steps: ["Смешайте всё.", "  ", "Обжарьте."],
  };

  it("черновик чистится: пустые шаги, неизвестные продукты и нулевой вес убираются", () => {
    const r = makeMyRecipe(draft, 1_700_000_000_000);
    expect(r.id).toMatch(/^my-/);
    expect(r.title).toBe("Мамины сырники");
    expect(r.ingredients.map((i) => i.id)).toEqual(["cottage5", "egg"]);
    expect(r.steps).toEqual(["Смешайте всё.", "Обжарьте."]);
    expect(draftProblem(draft)).toBe("");
    expect(draftProblem({ ...draft, title: " " })).toMatch(/название/);
    expect(draftProblem({ ...draft, steps: [""] })).toMatch(/шаг/);
  });

  it("из хранилища берутся только свои рецепты, КБЖУ регистрируется и снимается", () => {
    const r = makeMyRecipe(draft, 1_700_000_000_000);
    const clean = cleanMyRecipes([r, { ...r, id: "gs-чужой" }, { junk: 1 }, null]);
    expect(clean.map((x) => x.id)).toEqual([r.id]);
    addUserRecipe(r);
    expect(recipeMap[r.id]).toBe(r);
    expect(servingMacros[r.id].kcal).toBeGreaterThan(100);
    expect(recipes.some((x) => x.id === r.id)).toBe(false);
    removeUserRecipe(r.id);
    expect(recipeMap[r.id]).toBeUndefined();
    expect(userRecipeIds.has(r.id)).toBe(false);
  });
});
