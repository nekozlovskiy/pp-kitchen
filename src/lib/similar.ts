import type { Recipe } from "../types";

/**
 * Похожие рецепты: общие продукты с весом по редкости (масло и лук есть почти везде и о сходстве не говорят,
 * а тыква или кальмар — говорят), плюс немного за тот же раздел меню.
 */
export function makeSimilar(all: Recipe[]) {
  const df = new Map<string, number>();
  for (const r of all) for (const id of new Set(r.ingredients.map((i) => i.id))) df.set(id, (df.get(id) ?? 0) + 1);
  const weight = (id: string) => Math.log(all.length / (df.get(id) ?? 1));
  const sets = new Map(all.map((r) => [r.id, new Set(r.ingredients.map((i) => i.id))]));

  return (recipe: Recipe, n = 4, ok: (r: Recipe) => boolean = () => true): Recipe[] => {
    const mine = sets.get(recipe.id) ?? new Set(recipe.ingredients.map((i) => i.id));
    const scored: { r: Recipe; score: number }[] = [];
    for (const r of all) {
      if (r.id === recipe.id || !ok(r)) continue;
      const other = sets.get(r.id)!;
      let shared = 0;
      let union = 0;
      for (const id of new Set([...mine, ...other])) {
        const w = weight(id);
        union += w;
        if (mine.has(id) && other.has(id)) shared += w;
      }
      if (!shared) continue;
      const score = shared / union + (r.category === recipe.category ? 0.1 : 0);
      if (score >= 0.2) scored.push({ r, score });
    }
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, n)
      .map((x) => x.r);
  };
}
