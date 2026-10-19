import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { config } from "../config";
import { categoryLabel, ingredientMap, recipes, servingMacros } from "../data";
import { round } from "../lib/nutrition";
import { formatTime, plural } from "../lib/format";
import { matches, searchText } from "../lib/search";
import { Art } from "../art/Art";
import { FilterBar, KCAL_MAX, defaultFilters } from "../components/FilterBar";
import type { Filters } from "../components/FilterBar";
import { RecipeCard } from "../components/RecipeCard";
import { useStore } from "../hooks/useStore";

const texts = Object.fromEntries(recipes.map((r) => [r.id, searchText(r, ingredientMap)]));

/** Рецепт дня: один и тот же весь день, завтра следующий. */
function recipeOfTheDay() {
  const d = new Date();
  const days = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);
  return recipes[(days * 37) % recipes.length];
}

function Masthead() {
  return (
    <div className="masthead">
      <h1 className="masthead__title" aria-label="ПП-кухня">
        <span className="masthead__line">ПП‑</span>
        <span className="masthead__line">кухня</span>
      </h1>
      <p className="masthead__dedication">{config.dedication}</p>
      <svg className="masthead__squiggle" viewBox="0 0 260 18" aria-hidden="true">
        <path d="M2 12c22-10 40 6 62-2s38-10 60 0 40 6 62-2 46-8 70 2" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <p className="masthead__lede">
        {recipes.length} ПП-рецептов из редакционных подборок Леди Mail.ru. У каждого блюда посчитаны калории, белки, жиры и углеводы на порцию.
      </p>
    </div>
  );
}

function Feature() {
  const r = recipeOfTheDay();
  const location = useLocation();
  const m = round(servingMacros[r.id]);
  return (
    <article className="feature">
      <p className="feature__kicker">Рецепт дня</p>
      <Art className="feature__art" kind={r.art} category={r.category} seed={r.id} />
      <h2 className="feature__title">
        <Link to={`/recipe/${r.id}`} state={{ background: location }} className="card__link">
          {r.title}
        </Link>
      </h2>
      <p className="feature__desc">{r.description}</p>
      <div className="feature__foot">
        <p className="kcal kcal--xl">
          <span className="kcal__num">{m.kcal}</span>
          <span className="kcal__unit">ккал на порцию</span>
        </p>
        <p className="feature__meta">
          {categoryLabel[r.category]}
          <br />
          {formatTime(r.timeMinutes)}
        </p>
      </div>
    </article>
  );
}

export function Home() {
  const { favorites } = useStore();
  const [filters, setFilters] = useState<Filters>(defaultFilters);

  const list = useMemo(() => {
    const out = recipes.filter((r) => {
      const m = servingMacros[r.id];
      if (filters.category !== "all" && r.category !== filters.category) return false;
      if (filters.highProtein && m.p < 20) return false;
      if (filters.quick && r.timeMinutes > 20) return false;
      if (filters.favOnly && !favorites.has(r.id)) return false;
      if (filters.maxKcal < KCAL_MAX && m.kcal > filters.maxKcal) return false;
      if (filters.query.trim() && !matches(texts[r.id], filters.query)) return false;
      return true;
    });
    const by = {
      default: (a: string, b: string) => recipeRank[a] - recipeRank[b],
      kcal: (a: string, b: string) => servingMacros[a].kcal - servingMacros[b].kcal,
      protein: (a: string, b: string) => servingMacros[b].p - servingMacros[a].p,
      time: (a: string, b: string) => recipeTime[a] - recipeTime[b],
    }[filters.sort];
    return [...out].sort((a, b) => by(a.id, b.id));
  }, [filters, favorites]);

  const touched = JSON.stringify(filters) !== JSON.stringify(defaultFilters);

  return (
    <main className="home">
      <header className="cover wrap">
        <Masthead />
        <Feature />
      </header>

      <section className="catalog wrap" aria-labelledby="catalog-title">
        <h2 id="catalog-title" className="section-title">
          Все рецепты
        </h2>
        <FilterBar value={filters} onChange={setFilters} />
        <p className="count" aria-live="polite">
          {list.length > 0
            ? `${plural(list.length, ["Нашёлся", "Нашлось", "Нашлось"])} ${list.length} ${plural(list.length, ["рецепт", "рецепта", "рецептов"])}`
            : ""}
        </p>

        {list.length ? (
          <div className="grid">
            {list.map((r, i) => (
              <RecipeCard key={r.id} recipe={r} wide={!touched && i % 7 === 0} />
            ))}
          </div>
        ) : (
          <div className="empty">
            <p className="empty__title">Ничего не нашлось</p>
            <p>
              {filters.favOnly && favorites.size === 0
                ? "В избранном пока пусто. Нажмите на сердечко у рецепта, чтобы сохранить его."
                : "Попробуйте другое слово или ослабьте фильтры."}
            </p>
            <button type="button" className="btn btn--ghost" onClick={() => setFilters(defaultFilters)}>
              Сбросить фильтры
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

const recipeTime = Object.fromEntries(recipes.map((r) => [r.id, r.timeMinutes]));

// «По порядку»: сначала по разделам (завтраки → десерты), внутри раздела — как в recipes.json.
// Новые рецепты дописываются в конец файла, без этого они шли бы вперемешку после десертов.
const categoryOrder = ["breakfast", "lunch", "dinner", "snack", "dessert"];
const recipeRank = Object.fromEntries(
  recipes.map((r, i) => [r.id, categoryOrder.indexOf(r.category) * recipes.length + i]),
);
