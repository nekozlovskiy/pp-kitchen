import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { categoryLabel, ingredientMap, ingredients, recipes, servingMacros } from "../data";
import { fitsDiet } from "../lib/diet";
import { pantryMatches, staples } from "../lib/pantry";
import { matches, normalize } from "../lib/search";
import { plural } from "../lib/format";
import { useStore } from "../hooks/useStore";

// Продукты по частоте: самые ходовые сверху, чтобы не листать все 180 позиций.
const usage: Record<string, number> = {};
for (const r of recipes) for (const i of r.ingredients) usage[i.id] = (usage[i.id] ?? 0) + 1;
const byUsage = ingredients
  .filter((i) => usage[i.id] && !staples.includes(i.id))
  .sort((a, b) => usage[b.id] - usage[a.id] || a.name.localeCompare(b.name, "ru"));

const shortName = (id: string) => (ingredientMap[id]?.name ?? id).replace(/\s*\(.*\)$/, "").toLowerCase();

export function Pantry() {
  const { pantry, togglePantry, clearPantry, exclude, dislikes } = useStore();
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const have = useMemo(() => new Set(pantry), [pantry]);

  const options = useMemo(() => {
    const q = query.trim();
    const list = q ? byUsage.filter((i) => matches(normalize(i.name), q)) : byUsage;
    return showAll || q ? list : list.slice(0, 36);
  }, [query, showAll]);

  // Если с двумя докупками ничего не складывается, показываем все рецепты с выбранными продуктами.
  const { found, loose } = useMemo(() => {
    const pool = recipes.filter((r) => fitsDiet(r, exclude, dislikes));
    const strict = pantryMatches(pool, have, { maxMissing: 2 });
    return strict.length > 0
      ? { found: strict, loose: false }
      : { found: pantryMatches(pool, have, { maxMissing: Infinity }), loose: true };
  }, [have, exclude, dislikes]);
  const ready = found.filter((m) => m.missing.length === 0).length;

  return (
    <main className="pantry wrap">
      <header className="page-head">
        <h1 className="page-title">Из того, что есть</h1>
        <p className="page-sub">Отметьте продукты, которые есть дома. Масло считаем всегда: оно есть почти у всех.</p>
      </header>

      <section className="pantry__pick" aria-label="Продукты дома">
        {pantry.length > 0 && (
          <div className="pantry__have">
            <p className="pantry__h">
              Дома {pantry.length} {plural(pantry.length, ["продукт", "продукта", "продуктов"])}
            </p>
            <div className="chips chips--wrap">
              {pantry.map((id) => (
                <button key={id} type="button" className="chip is-on" onClick={() => togglePantry(id)} aria-label={`Убрать: ${ingredientMap[id]?.name}`}>
                  {ingredientMap[id]?.name} ×
                </button>
              ))}
            </div>
            <button type="button" className="btn btn--text" onClick={clearPantry}>
              Очистить
            </button>
          </div>
        )}

        <label className="search">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="m16 16 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="visually-hidden">Найти продукт</span>
          <input type="search" placeholder="Найти продукт: кабачок, творог…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>

        <div className="chips chips--wrap" role="group" aria-label="Продукты">
          {options
            .filter((i) => !have.has(i.id))
            .map((i) => (
              <button key={i.id} type="button" className="chip" onClick={() => togglePantry(i.id)}>
                + {i.name}
              </button>
            ))}
        </div>
        {!query && !showAll && (
          <button type="button" className="btn btn--text" onClick={() => setShowAll(true)}>
            Показать все продукты
          </button>
        )}
      </section>

      <section className="pantry__result" aria-live="polite" aria-label="Что можно приготовить">
        {pantry.length === 0 ? (
          <div className="empty">
            <p className="empty__title">Начните с пары продуктов</p>
            <p>Например, яйца, творог и кабачок: рецепты появятся здесь сразу.</p>
          </div>
        ) : found.length === 0 ? (
          <div className="empty">
            <p className="empty__title">Пока ничего не складывается</p>
            <p>Ни в одном рецепте нет выбранных продуктов. Попробуйте другие.</p>
          </div>
        ) : (
          <>
            {loose && (
              <p className="count">Сразу не складывается: вот рецепты с этими продуктами, сверху — где докупать меньше.</p>
            )}
            <p className="count">
              {ready > 0 ? `Можно приготовить сразу: ${ready}. ` : ""}
              Всего {found.length} {plural(found.length, ["рецепт", "рецепта", "рецептов"])}
            </p>
            <ul className="matches">
              {found.slice(0, 60).map(({ recipe, missing }) => (
                <li key={recipe.id} className="match">
                  <Link to={`/recipe/${recipe.id}`} state={{ background: location }} className="match__title">
                    {recipe.title}
                  </Link>
                  <span className="match__meta">
                    {categoryLabel[recipe.category]}, {Math.round(servingMacros[recipe.id].kcal)} ккал
                  </span>
                  <span className={`match__need ${missing.length ? "" : "is-ready"}`}>
                    {missing.length ? `Докупить: ${missing.map(shortName).join(", ")}` : "Всё есть"}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </main>
  );
}
