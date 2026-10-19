import type { Macros, Recipe } from "../types";
import { dietIngredients } from "./diet";

/** Главный продукт: рецепт подходит, если в нём есть хотя бы один продукт из группы. */
export const products: { id: string; label: string; ids: ReadonlySet<string> }[] = [
  { id: "chicken", label: "Курица", ids: new Set(["chicken", "chicken_thigh", "chicken_mince", "chicken_boiled", "chicken_smoked"]) },
  { id: "turkey", label: "Индейка", ids: new Set(["turkey", "turkey_mince", "turkey_thigh", "turkey_smoked", "turkey_boiled", "turkey_ham"]) },
  { id: "beef", label: "Говядина", ids: new Set(["beef", "beef_mince", "veal_mince"]) },
  { id: "liver", label: "Печень", ids: new Set(["chicken_liver", "beef_liver"]) },
  { id: "fish", label: "Рыба и морепродукты", ids: dietIngredients.fish },
  { id: "cottage", label: "Творог", ids: new Set(["cottage0", "cottage2", "cottage5", "cottage9", "cottage_grain"]) },
  { id: "egg", label: "Яйца", ids: dietIngredients.egg },
  { id: "mushrooms", label: "Грибы", ids: new Set(["mushrooms", "porcini", "porcini_dried"]) },
  { id: "cabbage", label: "Капуста", ids: new Set(["cabbage", "napa_cabbage", "sauerkraut", "cauliflower", "broccoli"]) },
  { id: "pumpkin", label: "Тыква", ids: new Set(["pumpkin"]) },
  { id: "zucchini", label: "Кабачок", ids: new Set(["zucchini"]) },
  {
    id: "legumes",
    label: "Бобовые",
    ids: new Set(["lentil", "lentil_green", "lentil_cooked", "chickpeas", "chickpeas_dry", "red_beans", "white_beans", "beans_dry"]),
  },
];

export const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

export function hasProduct(recipe: Recipe, productId: string): boolean {
  const group = productMap[productId];
  return !group || recipe.ingredients.some((i) => group.ids.has(i.id));
}

type Ctx = { macros: Macros; journal?: { cooked?: number; rating?: number } };

const OVEN = /духовк|запек|запеч|аэрогрил|выпека/i;
// «на пару секунд/минут» — не про пар; водяная баня в шагах бывает и для шоколада, поэтому её ищем только в названии
const STEAM = /на пару(?!\s+(секунд|минут|час|дн|ложек|капель|раз|штук))|пароварк|паров(ой|ые|ая|ых)\s/i;
const STEAM_TITLE = /на пару|паров|водяной бане/i;
const SOUP = /суп|борщ|щи\b|похл[её]бк|уха\b|окрошк|свекольник|солянк|рассольник|минестроне|гаспачо|крупник/i;
const SUGARS = new Set(["sugar", "honey", "maple_syrup", "agave_syrup", "topinambur_syrup"]);
const AUTUMN = new Set(["pumpkin", "cabbage", "napa_cabbage", "sauerkraut", "apple", "beet", "persimmon", "lingonberry", "cranberry"]);

/** Подборки на главной: готовые сочетания условий. */
export const collections: { id: string; title: string; hint: string; test: (r: Recipe, c: Ctx) => boolean }[] = [
  { id: "quick-dinner", title: "Ужин за 20 минут", hint: "Быстро после работы", test: (r) => r.category === "dinner" && r.timeMinutes <= 20 },
  { id: "light-dinner", title: "Лёгкий ужин", hint: "До 350 ккал на порцию", test: (r, c) => r.category === "dinner" && c.macros.kcal <= 350 },
  { id: "protein", title: "Много белка", hint: "От 25 г на порцию", test: (_, c) => c.macros.p >= 25 },
  { id: "steamed", title: "На пару", hint: "Пароварка, водяная баня, конверты", test: (r) => STEAM_TITLE.test(r.title) || r.steps.some((s) => STEAM.test(s)) },
  { id: "soups", title: "Супы", hint: "Горячие, холодные и крем-супы", test: (r) => SOUP.test(r.title) },
  { id: "autumn", title: "Осень: тыква и капуста", hint: "Сезонные овощи и яблоки", test: (r) => r.ingredients.some((i) => AUTUMN.has(i.id)) },
  { id: "no-oven", title: "Без духовки", hint: "Плита, кастрюля или без готовки", test: (r) => !r.steps.some((s) => OVEN.test(s)) },
  { id: "no-sugar", title: "Сладкое без сахара", hint: "Десерты без сахара и мёда", test: (r) => r.category === "dessert" && !r.ingredients.some((i) => SUGARS.has(i.id)) },
  { id: "loved", title: "Любимое", hint: "Высокие оценки и то, что готовила", test: (_, c) => (c.journal?.rating ?? 0) >= 4 || (c.journal?.cooked ?? 0) >= 2 },
];

export const collectionMap = Object.fromEntries(collections.map((c) => [c.id, c]));
