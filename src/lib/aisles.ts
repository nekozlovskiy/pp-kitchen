import { dietIngredients } from "./diet";

/** Отделы магазина в порядке обхода: сначала свежее, в конце бакалея. */
export const AISLES = [
  "Овощи и зелень",
  "Фрукты и ягоды",
  "Мясо и птица",
  "Рыба и морепродукты",
  "Молочное и сыр",
  "Яйца",
  "Хлеб",
  "Крупы, макароны, мука",
  "Орехи, семечки, сухофрукты",
  "Консервы и соленья",
  "Заморозка",
  "Бакалея, соусы и масла",
] as const;

export type Aisle = (typeof AISLES)[number];

const OTHER: Aisle = "Бакалея, соусы и масла";

const list: [Aisle, string][] = [
  ["Овощи и зелень", "potato sweet_potato zucchini broccoli cauliflower tomato cucumber bell_pepper carrot onion spinach lettuce cabbage green_beans mushrooms pumpkin beet avocado eggplant celery arugula radish napa_cabbage chili_pepper fennel celery_root ramsons leek green_radish sorrel kale mung_sprouts asparagus parsnip turnip parsley_root chard nettle porcini green_onion"],
  ["Фрукты и ягоды", "banana apple berries pear orange kiwi mango grapes pomegranate currant cherry pineapple cranberry persimmon lingonberry mandarin pomelo watermelon peach quince"],
  ["Хлеб", "whole_bread lavash tortilla white_bread burger_bun rye_crisps"],
  ["Крупы, макароны, мука", "oats oat_flour rice_flour whole_flour buckwheat bulgur rice_brown quinoa whole_pasta lentil millet rice_white soba wheat_flour green_buckwheat semolina corn_flour almond_flour glutinous_rice_flour oat_bran granola lasagna rice_cooked funchoza rye_flour wheat_bran coconut_flour beans_dry lentil_green spaghetti chickpeas_dry pearl_barley flax_flour split_peas wild_rice udon rice_noodles rice_paper"],
  ["Орехи, семечки, сухофрукты", "walnuts almonds chia sesame cashew nut_mix sunflower_seeds pumpkin_seeds dates raisins cranberry_dried pistachios poppy hazelnut flax peanuts dried_apricots dried_cherry dried_peach dried_figs pine_nuts coconut porcini_dried"],
  ["Консервы и соленья", "chickpeas red_beans canned_tomatoes corn tomato_paste olives pickles peas_canned white_beans lentil_cooked seaweed sauerkraut korean_carrot capers coconut_milk coconut_cream mussels"],
  ["Заморозка", "veg_mix peas"],
  // Растительное молоко и тофу лежат рядом с молочным; протеин, желатин и песто — в бакалее.
  ["Молочное и сыр", "plant_milk almond_milk tofu"],
  [OTHER, "pesto protein gelatin"],
];

const explicit = new Map<string, Aisle>(list.flatMap(([aisle, ids]) => ids.split(" ").map((id) => [id, aisle] as [string, Aisle])));

const byDiet: [ReadonlySet<string>, Aisle][] = [
  [dietIngredients.meat, "Мясо и птица"],
  [dietIngredients.fish, "Рыба и морепродукты"],
  [dietIngredients.dairy, "Молочное и сыр"],
  [dietIngredients.egg, "Яйца"],
];

/** Отдел магазина для продукта; всё неизвестное — в бакалею. */
export function aisleOf(id: string): Aisle {
  return explicit.get(id) ?? byDiet.find(([ids]) => ids.has(id))?.[1] ?? OTHER;
}

/** Раскладывает строки списка по отделам в порядке AISLES, пустые отделы пропускает. */
export function groupByAisle<T extends { id: string }>(lines: T[]): { aisle: Aisle; lines: T[] }[] {
  return AISLES.map((aisle) => ({ aisle, lines: lines.filter((l) => aisleOf(l.id) === aisle) })).filter((g) => g.lines.length);
}
