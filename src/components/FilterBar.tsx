import type { Category } from "../types";
import { categories } from "../data";
import { dietLabels } from "../lib/diet";
import type { DietTag } from "../lib/diet";
import { useStore } from "../hooks/useStore";
import { collectionMap, products } from "../lib/collections";

export type SortKey = "default" | "kcal" | "per100" | "protein" | "time" | "rating";

export type Filters = {
  query: string;
  category: Category | "all";
  highProtein: boolean;
  dense: boolean;
  videoOnly: boolean;
  quick: boolean;
  favOnly: boolean;
  cookedOnly: boolean;
  /** Главный продукт из lib/collections, "" — любой */
  product: string;
  /** Подборка с главной, "" — без подборки */
  collection: string;
  maxKcal: number;
  sort: SortKey;
};

export const KCAL_MAX = 600;

export const defaultFilters: Filters = {
  query: "",
  category: "all",
  highProtein: false,
  dense: false,
  videoOnly: false,
  quick: false,
  favOnly: false,
  cookedOnly: false,
  product: "",
  collection: "",
  maxKcal: KCAL_MAX,
  sort: "default",
};

export function FilterBar({ value, onChange }: { value: Filters; onChange: (f: Filters) => void }) {
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => onChange({ ...value, [k]: v });
  const { exclude, toggleExclude } = useStore();
  return (
    <div className="filters">
      <label className="search">
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="m16 16 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span className="visually-hidden">Поиск по рецептам</span>
        <input
          type="search"
          placeholder="Курица, творог, суп…"
          value={value.query}
          onChange={(e) => set("query", e.target.value)}
          enterKeyHint="search"
        />
      </label>

      <div className="chips" role="radiogroup" aria-label="Категория">
        {[{ id: "all" as const, plural: "Все" }, ...categories].map((c) => (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={value.category === c.id}
            className={`chip ${value.category === c.id ? "is-on" : ""}`}
            onClick={() => set("category", c.id)}
          >
            {c.plural}
          </button>
        ))}
      </div>

      <div className="chips" role="radiogroup" aria-label="Главный продукт">
        {[{ id: "", label: "Любой продукт" }, ...products].map((p) => (
          <button
            key={p.id || "any"}
            type="button"
            role="radio"
            aria-checked={value.product === p.id}
            className={`chip chip--soft ${value.product === p.id ? "is-on" : ""}`}
            onClick={() => set("product", value.product === p.id ? "" : p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="filters__row">
        <div className="toggles">
          {value.collection && collectionMap[value.collection] && (
            <button type="button" className="toggle is-on" aria-pressed="true" onClick={() => set("collection", "")} aria-label={`Убрать подборку «${collectionMap[value.collection].title}»`}>
              {collectionMap[value.collection].title} ×
            </button>
          )}
          <button type="button" className={`toggle ${value.highProtein ? "is-on" : ""}`} aria-pressed={value.highProtein} onClick={() => set("highProtein", !value.highProtein)}>
            Белка от 20 г
          </button>
          <button type="button" className={`toggle ${value.dense ? "is-on" : ""}`} aria-pressed={value.dense} onClick={() => set("dense", !value.dense)} title="От 10 г белка на каждые 100 ккал">
            Белковое
          </button>
          <button type="button" className={`toggle ${value.quick ? "is-on" : ""}`} aria-pressed={value.quick} onClick={() => set("quick", !value.quick)}>
            До 20 минут
          </button>
          <button type="button" className={`toggle ${value.favOnly ? "is-on" : ""}`} aria-pressed={value.favOnly} onClick={() => set("favOnly", !value.favOnly)}>
            Избранное
          </button>
          <button type="button" className={`toggle ${value.cookedOnly ? "is-on" : ""}`} aria-pressed={value.cookedOnly} onClick={() => set("cookedOnly", !value.cookedOnly)}>
            Готовила
          </button>
          <button type="button" className={`toggle ${value.videoOnly ? "is-on" : ""}`} aria-pressed={value.videoOnly} onClick={() => set("videoOnly", !value.videoOnly)}>
            С видео
          </button>
        </div>

        <details className="diet">
          <summary>
            Ограничения в еде{exclude.length ? `: ${exclude.length}` : ""}
          </summary>
          <div className="toggles">
            {(Object.keys(dietLabels) as DietTag[]).map((tag) => (
              <button
                key={tag}
                type="button"
                className={`toggle ${exclude.includes(tag) ? "is-on" : ""}`}
                aria-pressed={exclude.includes(tag)}
                onClick={() => toggleExclude(tag)}
              >
                {dietLabels[tag]}
              </button>
            ))}
          </div>
          <p className="diet__hint">Запоминается на этом телефоне. Овсянку считаем с глютеном.</p>
        </details>

        <label className="range">
          <span>
            {value.maxKcal >= KCAL_MAX ? "Любая калорийность" : `До ${value.maxKcal} ккал`}
          </span>
          <input
            type="range"
            min={100}
            max={KCAL_MAX}
            step={10}
            value={value.maxKcal}
            onChange={(e) => set("maxKcal", Number(e.target.value))}
            aria-label="Максимум калорий на порцию"
          />
        </label>

        <label className="select">
          <span className="visually-hidden">Сортировка</span>
          <select value={value.sort} onChange={(e) => set("sort", e.target.value as SortKey)}>
            <option value="default">По порядку</option>
            <option value="kcal">Сначала лёгкие</option>
            <option value="per100">Меньше ккал в 100 г</option>
            <option value="protein">Больше белка</option>
            <option value="time">Быстрее готовить</option>
            <option value="rating">Мои оценки</option>
          </select>
        </label>
      </div>
    </div>
  );
}
