import type { Recipe } from "../types";

/** Ограничения в еде, по которым можно исключать рецепты. */
export type DietTag = "meat" | "fish" | "dairy" | "egg" | "gluten";

export const dietLabels: Record<DietTag, string> = {
  meat: "Без мяса",
  fish: "Без рыбы",
  dairy: "Без молочного",
  egg: "Без яиц",
  gluten: "Без глютена",
};

// Какие продукты из ingredients.json попадают под ограничение.
// Овёс считаем с глютеном: обычные хлопья почти всегда содержат его следы.
const tagged: Record<DietTag, string[]> = {
  meat: [
    "chicken", "chicken_thigh", "chicken_liver", "chicken_mince", "chicken_boiled",
    "turkey", "turkey_mince", "turkey_smoked", "turkey_thigh", "beef", "beef_mince", "gelatin", "chicken_smoked", "pork_lean", "turkey_ham", "turkey_boiled", "beef_liver", "veal_mince",
  ],
  fish: [
    "cod", "pollock", "salmon", "salmon_salted", "pink_salmon_boiled", "trout", "tuna", "tuna_fresh",
    "shrimp", "squid", "crab_sticks", "mackerel", "mussels", "herring_salted",
  ],
  dairy: [
    "cottage0", "cottage2", "cottage5", "yogurt", "yogurt0", "yogurt_natural", "kefir", "milk", "milk25",
    "sour_cream", "sour_cream15", "cream10", "dry_milk", "butter", "cheese_light", "cheese_hard", "feta",
    "mozzarella", "parmesan", "ricotta", "cream_cheese", "suluguni", "protein", "yogurt_greek_fat", "ryazhenka",
    "cottage_grain", "pesto", "gorgonzola", "cottage9", "sour_cream20", "processed_cheese", "ghee", "yogurt6", "adyghe_cheese", "kefir25",
  ],
  egg: ["egg", "egg_white", "egg_yolk", "quail_egg"],
  gluten: [
    "wheat_flour", "whole_flour", "whole_bread", "lavash", "tortilla", "whole_pasta", "lasagna", "bulgur",
    "semolina", "soy_sauce", "crab_sticks", "oats", "oat_flour", "oat_bran", "granola", "rye_flour", "wheat_bran", "teriyaki",
    "burger_bun", "breadcrumbs", "spaghetti", "white_bread", "rye_crisps",
  ],
};

export const dietIngredients: Record<DietTag, ReadonlySet<string>> = {
  meat: new Set(tagged.meat),
  fish: new Set(tagged.fish),
  dairy: new Set(tagged.dairy),
  egg: new Set(tagged.egg),
  gluten: new Set(tagged.gluten),
};

/** Подходит ли рецепт, если исключить все перечисленные группы продуктов. */
export function fitsDiet(recipe: Recipe, exclude: readonly DietTag[]): boolean {
  return exclude.every((tag) => recipe.ingredients.every((i) => !dietIngredients[tag].has(i.id)));
}
