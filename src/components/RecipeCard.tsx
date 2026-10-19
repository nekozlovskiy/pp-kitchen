import { Link, useLocation } from "react-router-dom";
import type { Recipe } from "../types";
import { categoryLabel, servingMacros } from "../data";
import { round } from "../lib/nutrition";
import { formatTime } from "../lib/format";
import { Art } from "../art/Art";
import { MacroRing } from "./MacroRing";
import { useStore } from "../hooks/useStore";
import { usePhotoUrl } from "../hooks/usePhoto";

export function HeartButton({ id, title, className = "" }: { id: string; title: string; className?: string }) {
  const { favorites, toggleFavorite } = useStore();
  const on = favorites.has(id);
  return (
    <button
      type="button"
      className={`heart ${on ? "is-on" : ""} ${className}`}
      aria-pressed={on}
      aria-label={on ? `Убрать «${title}» из избранного` : `Добавить «${title}» в избранное`}
      onClick={() => toggleFavorite(id)}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />
      </svg>
    </button>
  );
}

export function RecipeCard({ recipe, wide = false }: { recipe: Recipe; wide?: boolean }) {
  const location = useLocation();
  const { journal } = useStore();
  const entry = journal[recipe.id];
  const photo = usePhotoUrl(recipe.id, entry?.photo);
  const m = round(servingMacros[recipe.id]);
  return (
    <article className={`card ${wide ? "card--wide" : ""}`}>
      <div className="card__art">
        {photo ? (
          <img className="card__photo" src={photo} alt="" loading="lazy" />
        ) : (
          <Art kind={recipe.art} category={recipe.category} seed={recipe.id} />
        )}
        {entry?.rating ? (
          <span className="card__rating" aria-label={`Моя оценка ${entry.rating} из 5`}>
            ★ {entry.rating}
          </span>
        ) : null}
      </div>
      <div className="card__body">
        <p className="card__meta">
          {categoryLabel[recipe.category]}, {formatTime(recipe.timeMinutes)}
          {recipe.video && <span className="card__video">видео</span>}
        </p>
        <h3 className="card__title">
          <Link to={`/recipe/${recipe.id}`} state={{ background: location }} className="card__link">
            {recipe.title}
          </Link>
        </h3>
        {wide && <p className="card__desc">{recipe.description}</p>}
        <div className="card__foot">
          <p className="kcal">
            <span className="kcal__num">{m.kcal}</span>
            <span className="kcal__unit">ккал</span>
          </p>
          <MacroRing macros={m} size={34} />
          <dl className="macros-mini">
            <div>
              <dt className="dot dot--p">Б</dt>
              <dd>{m.p}</dd>
            </div>
            <div>
              <dt className="dot dot--f">Ж</dt>
              <dd>{m.f}</dd>
            </div>
            <div>
              <dt className="dot dot--c">У</dt>
              <dd>{m.c}</dd>
            </div>
          </dl>
        </div>
      </div>
      <HeartButton id={recipe.id} title={recipe.title} className="card__heart" />
    </article>
  );
}
