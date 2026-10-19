import { useCallback, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { categoryLabel, ingredientMap, recipeMap, servingMacros, sources } from "../data";
import { macroPercents, round } from "../lib/nutrition";
import { scaleIngredients } from "../lib/nutrition";
import { formatAmount, formatTime, servingsLabel } from "../lib/format";
import { Art } from "../art/Art";
import { MacroRing } from "../components/MacroRing";
import { Sheet } from "../components/Sheet";
import { Stepper } from "../components/Stepper";
import { HeartButton } from "../components/RecipeCard";
import { useStore } from "../hooks/useStore";
import { useWakeLock } from "../hooks/useWakeLock";
import { usePhotoUrl } from "../hooks/usePhoto";
import { CookMode } from "../components/CookMode";
import { RecipeJournal } from "../components/RecipeJournal";
import { StepText } from "../components/StepText";
import { ReelEmbed } from "../components/ReelEmbed";
import type { Recipe } from "../types";

function RecipeBody({ recipe }: { recipe: Recipe }) {
  const { addToDay, addToShopping, showToast, journal } = useStore();
  const [servings, setServings] = useState(recipe.servings);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [keepAwake, setKeepAwake] = useState(false);
  const [cooking, setCooking] = useState(false);
  const wake = useWakeLock(keepAwake);
  const photo = usePhotoUrl(recipe.id, journal[recipe.id]?.photo);
  const closeCook = useCallback(() => setCooking(false), []);
  const m = round(servingMacros[recipe.id]);
  const pc = macroPercents(servingMacros[recipe.id]);
  const items = scaleIngredients(recipe, servings);

  const toggle = (i: number) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <article className="recipe">
      <header className="recipe__head">
        {photo ? (
          <img className="recipe__art recipe__photo" src={photo} alt={`Моё фото: ${recipe.title}`} />
        ) : (
          <Art className="recipe__art" kind={recipe.art} category={recipe.category} seed={recipe.id} />
        )}
        <p className="recipe__cat">{categoryLabel[recipe.category]}</p>
        <h1 className="recipe__title">{recipe.title}</h1>
        <p className="recipe__desc">{recipe.description}</p>
        <ul className="recipe__facts">
          <li>
            <span>Время</span>
            <b>
              {formatTime(recipe.timeMinutes)}
              {recipe.timeNote ? ` ${recipe.timeNote}` : ""}
            </b>
          </li>
          <li>
            <span>Сложность</span>
            <b>{recipe.level}</b>
          </li>
          <li>
            <span>Порция</span>
            <b>{recipe.portionLabel ?? `1 из ${recipe.servings}`}</b>
          </li>
        </ul>
      </header>

      {recipe.video && <ReelEmbed url={recipe.video} title={recipe.title} />}

      <section className="nutrition" aria-label="Пищевая ценность одной порции">
        <MacroRing macros={servingMacros[recipe.id]} size={148} stroke={14}>
          <span className="kcal kcal--ring">
            <span className="kcal__num">{m.kcal}</span>
            <span className="kcal__unit">ккал</span>
          </span>
        </MacroRing>
        <dl className="macros">
          <div className="macros__row">
            <dt>
              <i className="dot dot--p" /> Белки
            </dt>
            <dd>
              <b>{m.p} г</b> <span>{pc.p}% калорий</span>
            </dd>
          </div>
          <div className="macros__row">
            <dt>
              <i className="dot dot--f" /> Жиры
            </dt>
            <dd>
              <b>{m.f} г</b> <span>{pc.f}% калорий</span>
            </dd>
          </div>
          <div className="macros__row">
            <dt>
              <i className="dot dot--c" /> Углеводы
            </dt>
            <dd>
              <b>{m.c} г</b> <span>{pc.c}% калорий</span>
            </dd>
          </div>
        </dl>
      </section>

      <div className="recipe__actions">
        <button
          type="button"
          className="btn btn--accent"
          onClick={() => {
            addToDay(recipe.id, 1);
            showToast("Порция добавлена в «Мой день»");
          }}
        >
          В мой день
        </button>
        <HeartButton id={recipe.id} title={recipe.title} className="heart--big" />
      </div>

      <div className="cook-bar">
        <button type="button" className="btn btn--ghost" onClick={() => setCooking(true)}>
          Готовить по шагам
        </button>
        {wake.supported && (
          <label className="switch">
            <input type="checkbox" checked={keepAwake} onChange={(e) => setKeepAwake(e.target.checked)} />
            <span>Не гасить экран</span>
          </label>
        )}
      </div>
      {cooking && <CookMode recipe={recipe} servings={servings} onClose={closeCook} />}

      <section className="recipe__section">
        <div className="recipe__section-head">
          <h2>Продукты</h2>
          <Stepper value={servings} onChange={setServings} label="Число порций" min={1} max={20} format={servingsLabel} />
        </div>
        <ul className="ingredients">
          {items.map((it, i) => {
            const ing = ingredientMap[it.id];
            return (
              <li key={it.id}>
                <label className={checked.has(i) ? "is-done" : ""}>
                  <input type="checkbox" checked={checked.has(i)} onChange={() => toggle(i)} />
                  <span className="ingredients__name">{ing?.name ?? it.id}</span>
                  <span className="ingredients__amount">{formatAmount(ing, it.grams)}</span>
                </label>
              </li>
            );
          })}
        </ul>
        <div className="recipe__tools">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => {
              addToShopping(recipe.id, servings);
              showToast(`Продукты на ${servingsLabel(servings)} добавлены в покупки`);
            }}
          >
            В покупки
          </button>
          <button type="button" className="btn btn--text" onClick={() => window.print()}>
            Распечатать
          </button>
        </div>
        {recipe.extras?.length ? (
          <ul className="extras">
            {recipe.extras.map((e) => (
              <li key={e.name}>
                <span>{e.name}</span>
                <span>{e.amount}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="recipe__section">
        <h2>Как готовить</h2>
        <ol className="steps">
          {recipe.steps.map((s, i) => (
            <li key={i}>
              <span>
                <StepText text={s} recipeTitle={recipe.title} />
              </span>
            </li>
          ))}
        </ol>
      </section>

      {recipe.tip && (
        <aside className="tip">
          <p className="tip__label">Совет</p>
          <p>{recipe.tip}</p>
        </aside>
      )}

      <RecipeJournal recipe={recipe} />

      {sources[recipe.source]?.site === "Instagram" ? (
        <p className="source">
          Рецепт из видео{" "}
          <a href={sources[recipe.source].url} target="_blank" rel="noopener noreferrer">
            {sources[recipe.source].author}
          </a>{" "}
          в Instagram. КБЖУ посчитано нами по составу.
        </p>
      ) : sources[recipe.source] && (
        <p className="source">
          Рецепт из подборки «
          <a href={sources[recipe.source].url} target="_blank" rel="noopener noreferrer">
            {sources[recipe.source].title}
          </a>
          », {sources[recipe.source].site}, автор {sources[recipe.source].author}. КБЖУ посчитано нами по составу.
        </p>
      )}
    </article>
  );
}

export function RecipeSheet() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const recipe = recipeMap[id];
  const hasBackground = Boolean((location.state as { background?: unknown } | null)?.background);

  const close = useCallback(() => {
    if (hasBackground) navigate(-1);
    else navigate("/", { replace: true });
  }, [hasBackground, navigate]);

  if (!recipe) {
    return (
      <Sheet label="Рецепт не найден" onClose={close}>
        <div className="empty empty--sheet">
          <p className="empty__title">Такого рецепта нет</p>
          <p>Возможно, ссылка устарела. Загляните в каталог: там {Object.keys(recipeMap).length} блюд.</p>
          <Link className="btn btn--accent" to="/" replace>
            К рецептам
          </Link>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet label={recipe.title} onClose={close}>
      <RecipeBody key={recipe.id} recipe={recipe} />
    </Sheet>
  );
}
