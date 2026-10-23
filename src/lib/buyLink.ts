import { ingredientMap } from "../data";

// Одни лимиты для сборки и разбора ссылки: что ушло — то и откроется.
export const MAX_EXTRAS = 30;
const EXTRA_LEN = 80;
const cleanExtras = (list: readonly string[]) => list.map((s) => s.trim().slice(0, EXTRA_LEN)).filter(Boolean).slice(0, MAX_EXTRAS);

/**
 * «Покупки — тебе в магазин»: список целиком лежит в ссылке, без сервера.
 * #/buy?l=chicken:500,egg:110&x=Соль|Чеснок
 */
export function buyLink(lines: readonly { id: string; grams: number }[], extras: readonly string[]): string {
  const l = lines.map((x) => `${x.id}:${Math.round(x.grams)}`).join(",");
  const clean = cleanExtras(extras.map((s) => s.replace(/\|/g, "/")));
  const x = clean.length ? `&x=${encodeURIComponent(clean.join("|"))}` : "";
  return `${location.origin}${location.pathname}#/buy?l=${l}${x}`;
}

/**
 * Разобрать ссылку: мусор отбрасывается, повторы складываются.
 * unknown — продукты, которых нет в этой версии сайта (старый кэш на его телефоне): о них надо сказать, а не терять молча.
 */
export function parseBuy(params: URLSearchParams): { lines: { id: string; grams: number }[]; extras: string[]; unknown: number } {
  const sums = new Map<string, number>();
  let unknown = 0;
  for (const part of (params.get("l") ?? "").split(",")) {
    if (!part) continue;
    const [id, g] = part.split(":");
    const grams = Number(g);
    if (!Number.isFinite(grams) || grams <= 0) continue;
    if (!ingredientMap[id]) {
      unknown++;
      continue;
    }
    sums.set(id, (sums.get(id) ?? 0) + grams);
  }
  const extras = cleanExtras((params.get("x") ?? "").split("|"));
  return { lines: [...sums].map(([id, grams]) => ({ id, grams })), extras, unknown };
}
