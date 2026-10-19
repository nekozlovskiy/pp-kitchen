export type Macros = { kcal: number; p: number; f: number; c: number };

export type Ingredient = {
  id: string;
  name: string;
  per100: Macros;
  unit?: "g" | "ml";
  piece?: { grams: number; label: string };
};

export type Category = "breakfast" | "lunch" | "dinner" | "snack" | "dessert";

export type ArtKind =
  | "plate"
  | "bowl"
  | "soup"
  | "glass"
  | "jar"
  | "pan"
  | "cake"
  | "cookies"
  | "roll"
  | "toast"
  | "pancakes"
  | "fish"
  | "salad"
  | "cutlets"
  | "muffin"
  | "pie"
  | "cakeslice"
  | "balls"
  | "eggs"
  | "spirals"
  | "pot"
  | "casserole"
  | "bread"
  | "mousse";

export type Recipe = {
  id: string;
  category: Category;
  title: string;
  description: string;
  timeMinutes: number;
  timeNote?: string;
  level: "Легко" | "Средне" | "Сложно";
  servings: number;
  portionLabel?: string;
  ingredients: { id: string; grams: number }[];
  extras?: { name: string; amount: string }[];
  steps: string[];
  tip?: string;
  image?: string;
  /** Ссылка на пост или рилс в Instagram, если рецепт взят из видео */
  video?: string;
  art: ArtKind;
  /** Ключ в sources.json: откуда взят состав рецепта */
  source: string;
};

export type Source = { site: string; title: string; author: string; date: string; url: string };
