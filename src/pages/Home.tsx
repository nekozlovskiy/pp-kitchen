import { useEffect, useMemo, useState } from "react";
import { fitsDiet } from "../lib/diet";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { config } from "../config";
import { categories, categoryLabel, ingredientMap, isProteinDense, per100Macros, recipes, servingMacros } from "../data";
import { round } from "../lib/nutrition";
import { formatTime, plural, todayKey } from "../lib/format";
import { matches, searchText } from "../lib/search";
import { Art } from "../art/Art";
import { FilterBar, KCAL_MAX, defaultFilters } from "../components/FilterBar";
import type { Filters } from "../components/FilterBar";
import type { Category } from "../types";
import { RecipeCard } from "../components/RecipeCard";
import { useStore } from "../hooks/useStore";
import { collectionMap, collections, hasProduct } from "../lib/collections";

const texts = Object.fromEntries(recipes.map((r) => [r.id, searchText(r, ingredientMap)]));

/** Рецепт дня: один и тот же весь день, завтра следующий. */
function recipeOfTheDay() {
  const d = new Date();
  const days = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);
  return recipes[(days * 37) % recipes.length];
}

/** Записка дня: своя на каждый день, по кругу. Сдвиг, чтобы не совпадала по ритму с рецептом дня. В особые даты — своя. */
function noteOfTheDay() {
  const d = new Date();
  const special = config.dateNotes[todayKey(d).slice(5)];
  if (special) return special;
  const days = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);
  return config.notes[(days + 3) % config.notes.length];
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
      {config.notes.length > 0 && (
        <p className="masthead__note">
          <span>Записка дня</span>
          {noteOfTheDay()}
        </p>
      )}
      <p className="masthead__lede">
        {recipes.length} {plural(recipes.length, ["ПП-рецепт", "ПП-рецепта", "ПП-рецептов"])} из редакционных подборок и рецептов Леди Mail.ru, Food.ru и журнала «Гастроном» и любимых рилсов. У каждого блюда посчитаны калории, белки, жиры и углеводы на порцию и на 100 г.
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

/** Лента подборок: готовые сочетания фильтров. «Любимое» появляется, когда есть оценки или повторы. */
function Collections({ onPick }: { onPick: (id: string) => void }) {
  const { journal, exclude, dislikes, fresh } = useStore();
  const items = useMemo(
    () =>
      collections
        .map((c) => ({
          ...c,
          count: recipes.filter((r) => fitsDiet(r, exclude, dislikes) && c.test(r, { macros: servingMacros[r.id], journal: journal[r.id], fresh: fresh.has(r.id) })).length,
        }))
        .filter((c) => c.count > 0),
    [journal, exclude, dislikes, fresh],
  );
  return (
    <section className="collections wrap" aria-labelledby="collections-title">
      <h2 id="collections-title" className="section-title">
        Подборки
      </h2>
      <ul className="collections__list">
        {items.map((c) => (
          <li key={c.id}>
            <button type="button" className={`collection collection--${c.id}`} onClick={() => onPick(c.id)}>
              <b>{c.title}</b>
              <span>{c.hint}</span>
              <small>
                {c.count} {plural(c.count, ["рецепт", "рецепта", "рецептов"])}
              </small>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** «Не знаю, что приготовить»: случайное блюдо из выбранного раздела с учётом ограничений и «Не люблю». */
function Surprise() {
  const { exclude, dislikes } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [cat, setCat] = useState<Category | "all">("all");
  const pick = () => {
    const pool = recipes.filter((r) => (cat === "all" || r.category === cat) && fitsDiet(r, exclude, dislikes));
    if (!pool.length) return;
    const r = pool[Math.floor(Math.random() * pool.length)];
    navigate(`/recipe/${r.id}`, { state: { background: location } });
  };
  return (
    <section className="surprise wrap" aria-labelledby="surprise-title">
      <h2 id="surprise-title" className="surprise__title">
        Не знаю, что приготовить
      </h2>
      <div className="toggles" role="group" aria-label="Раздел">
        {([["all", "Что угодно"], ...categories.map((c) => [c.id, c.label])] as [Category | "all", string][]).map(([id, label]) => (
          <button key={id} type="button" className={`toggle ${cat === id ? "is-on" : ""}`} aria-pressed={cat === id} onClick={() => setCat(id)}>
            {label}
          </button>
        ))}
      </div>
      <button type="button" className="btn btn--accent surprise__go" onClick={pick}>
        Выбери за меня
      </button>
    </section>
  );
}

export function Home() {
  const { favorites, exclude, dislikes, journal, fresh } = useStore();
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [limit, setLimit] = useState(PAGE);

  // Новый поиск или фильтр снова показывает первую страницу результатов.
  const changeFilters = (next: Filters) => {
    setFilters(next);
    setLimit(PAGE);
  };

  const list = useMemo(() => {
    const out = recipes.filter((r) => {
      const m = servingMacros[r.id];
      if (filters.category !== "all" && r.category !== filters.category) return false;
      if (filters.highProtein && m.p < 20) return false;
      if (filters.dense && !isProteinDense(r.id)) return false;
      if (filters.videoOnly && !r.video) return false;
      if (filters.quick && r.timeMinutes > 20) return false;
      if (filters.favOnly && !favorites.has(r.id)) return false;
      if (filters.cookedOnly && !journal[r.id]?.cooked) return false;
      if (filters.product && !hasProduct(r, filters.product)) return false;
      const col = collectionMap[filters.collection];
      if (col && !col.test(r, { macros: m, journal: journal[r.id], fresh: fresh.has(r.id) })) return false;
      if (!fitsDiet(r, exclude, dislikes)) return false;
      if (filters.maxKcal < KCAL_MAX && m.kcal > filters.maxKcal) return false;
      if (filters.query.trim() && !matches(texts[r.id], filters.query)) return false;
      return true;
    });
    const by = {
      default: (a: string, b: string) => recipeRank[a] - recipeRank[b],
      kcal: (a: string, b: string) => servingMacros[a].kcal - servingMacros[b].kcal,
      per100: (a: string, b: string) => per100Macros[a].kcal - per100Macros[b].kcal,
      protein: (a: string, b: string) => servingMacros[b].p - servingMacros[a].p,
      time: (a: string, b: string) => recipeTime[a] - recipeTime[b],
      // Сначала с высокой оценкой, при равной — что готовила чаще, остальное как «по порядку».
      rating: (a: string, b: string) =>
        (journal[b]?.rating ?? 0) - (journal[a]?.rating ?? 0) ||
        (journal[b]?.cooked ?? 0) - (journal[a]?.cooked ?? 0) ||
        recipeRank[a] - recipeRank[b],
    }[filters.sort];
    return [...out].sort((a, b) => by(a.id, b.id));
  }, [filters, favorites, exclude, dislikes, journal, fresh]);

  // Смена ограничений в еде тоже возвращает к первой странице.
  useEffect(() => setLimit(PAGE), [exclude, dislikes]);

  const touched = JSON.stringify(filters) !== JSON.stringify(defaultFilters);

  return (
    <main className="home">
      <header className="cover wrap">
        <Masthead />
        <Feature />
      </header>

      <Collections
        onPick={(id) => {
          changeFilters({ ...defaultFilters, collection: id });
          document.getElementById("catalog-title")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
      />

      <Surprise />

      <section className="catalog wrap" aria-labelledby="catalog-title">
        <h2 id="catalog-title" className="section-title">
          Все рецепты
        </h2>
        <Link to="/pantry" className="pantry-link">
          <span>
            <b>Что приготовить из того, что есть</b>
            <span>Отметьте продукты дома, а мы подберём рецепты</span>
          </span>
          <span aria-hidden="true">→</span>
        </Link>
        <FilterBar value={filters} onChange={changeFilters} />
        <p className="count" aria-live="polite">
          {list.length > 0
            ? `${plural(list.length, ["Нашёлся", "Нашлось", "Нашлось"])} ${list.length} ${plural(list.length, ["рецепт", "рецепта", "рецептов"])}`
            : ""}
        </p>

        {list.length ? (
          <>
            <div className="grid">
              {list.slice(0, limit).map((r, i) => (
                <RecipeCard key={r.id} recipe={r} wide={!touched && i % 7 === 0} />
              ))}
            </div>
            {list.length > limit && (
              <div className="more">
                <button type="button" className="btn btn--ghost" onClick={() => setLimit(limit + PAGE)}>
                  Показать ещё {Math.min(PAGE, list.length - limit)}
                </button>
                <p className="more__note">
                  Показано {limit} из {list.length}
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="empty">
            <p className="empty__title">Ничего не нашлось</p>
            <p>
              {filters.favOnly && favorites.size === 0
                ? "В избранном пока пусто. Нажмите на сердечко у рецепта, чтобы сохранить его."
                : "Попробуйте другое слово или ослабьте фильтры."}
            </p>
            <button type="button" className="btn btn--ghost" onClick={() => changeFilters(defaultFilters)}>
              Сбросить фильтры
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

/** Сколько карточек показывать за раз: 190 рецептов одним списком — больше сотни экранов на телефоне. */
const PAGE = 24;

const recipeTime = Object.fromEntries(recipes.map((r) => [r.id, r.timeMinutes]));

// «По порядку»: разделы по кругу (завтрак, обед, ужин, перекус, десерт, снова завтрак…),
// внутри раздела — как в recipes.json. Так уже первая страница показывает всё понемногу.
const categoryOrder = ["breakfast", "lunch", "dinner", "snack", "dessert"];
const seen: Record<string, number> = {};
const recipeRank = Object.fromEntries(
  recipes.map((r) => {
    const n = (seen[r.category] = (seen[r.category] ?? -1) + 1);
    return [r.id, n * categoryOrder.length + categoryOrder.indexOf(r.category)];
  }),
);
