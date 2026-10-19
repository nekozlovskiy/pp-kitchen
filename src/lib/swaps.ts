import type { Recipe } from "../types";

/** Замена продукта тем же весом: какие id меняем, на что и как подписать кнопку. */
export type Swap = { key: string; from: string[]; to: string; label: string };

export const SWAPS: Swap[] = [
  { key: "sugar-sweetener", from: ["sugar", "honey"], to: "erythritol", label: "Сахар и мёд → сахарозаменитель" },
  { key: "sour-yogurt", from: ["sour_cream", "sour_cream15", "sour_cream20"], to: "yogurt", label: "Сметана → греческий йогурт" },
  { key: "cream-milk", from: ["cream10"], to: "milk25", label: "Сливки → молоко" },
  { key: "milk-plant", from: ["milk", "milk25"], to: "plant_milk", label: "Молоко → растительное" },
  { key: "cottage-zero", from: ["cottage5", "cottage9", "cottage2"], to: "cottage0", label: "Творог → обезжиренный" },
  { key: "cheese-light", from: ["cheese_hard"], to: "cheese_light", label: "Твёрдый сыр → лёгкий 17%" },
  { key: "flour-rice", from: ["wheat_flour"], to: "rice_flour", label: "Пшеничная мука → рисовая" },
  { key: "pasta-whole", from: ["spaghetti"], to: "whole_pasta", label: "Спагетти → цельнозерновые" },
  { key: "rice-brown", from: ["rice_white"], to: "rice_brown", label: "Белый рис → бурый" },
  { key: "beef-turkey", from: ["beef_mince"], to: "turkey_mince", label: "Говяжий фарш → фарш индейки" },
  { key: "thigh-breast", from: ["chicken_thigh"], to: "chicken", label: "Куриное бедро → грудка" },
  { key: "bread-whole", from: ["white_bread"], to: "whole_bread", label: "Батон → цельнозерновой хлеб" },
];

/** Замены, которые имеют смысл для этого рецепта. */
export function availableSwaps(recipe: Recipe): Swap[] {
  const ids = new Set(recipe.ingredients.map((i) => i.id));
  return SWAPS.filter((s) => s.from.some((id) => ids.has(id)));
}

/** Рецепт с применёнными заменами; одинаковые продукты после замены складываются. */
export function applySwaps(recipe: Recipe, keys: readonly string[] | undefined): Recipe {
  if (!keys?.length) return recipe;
  const map = new Map<string, string>();
  for (const s of SWAPS) if (keys.includes(s.key)) for (const id of s.from) map.set(id, s.to);
  const merged = new Map<string, number>();
  for (const i of recipe.ingredients) {
    const id = map.get(i.id) ?? i.id;
    merged.set(id, (merged.get(id) ?? 0) + i.grams);
  }
  return { ...recipe, ingredients: [...merged].map(([id, grams]) => ({ id, grams })) };
}
