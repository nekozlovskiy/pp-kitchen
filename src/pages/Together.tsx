import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ingredientMap, recipeAliases, recipeMap } from "../data";
import { formatAmount, servingsLabel } from "../lib/format";
import { scaleIngredients } from "../lib/nutrition";
import { readJSON, writeJSON } from "../lib/storage";
import { parseTogether } from "../lib/together";
import { StepText } from "../components/StepText";

/** Его часть готовки по ссылке от Анюты: продукты и только его шаги с галочками. */
export function Together() {
  const { id = "" } = useParams();
  const [params] = useSearchParams();
  const recipe = recipeMap[id] ?? recipeMap[recipeAliases[id]];
  const [checked, setChecked] = useState<Set<number>>(() => new Set(readJSON<Record<string, number[]>>("pp.togetherChecks", {})[id] ?? []));

  if (!recipe) {
    return (
      <main className="wrap">
        <div className="empty">
          <p className="empty__title">Рецепт не найден</p>
          <Link to="/" className="btn btn--accent">
            К рецептам
          </Link>
        </div>
      </main>
    );
  }

  const { servings, steps } = parseTogether(params, recipe.steps.length, recipe.servings);
  const toggle = (i: number) => {
    const next = new Set(checked);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    setChecked(next);
    writeJSON("pp.togetherChecks", { ...readJSON<Record<string, number[]>>("pp.togetherChecks", {}), [id]: [...next] });
  };

  return (
    <main className="wrap together-page">
      <header className="page-head">
        <p className="page-sub">Готовим вместе 👨‍🍳</p>
        <h1 className="page-title">{recipe.title}</h1>
        <p className="page-sub">
          Твоих шагов: {steps.length} из {recipe.steps.length} · {servingsLabel(servings)}
        </p>
      </header>

      <section className="recipe__section">
        <h2>Твои шаги</h2>
        {steps.length ? (
          <ol className="together-page__steps">
            {steps.map((i) => (
              <li key={i}>
                <label className={`together-page__step ${checked.has(i) ? "is-done" : ""}`}>
                  <input type="checkbox" checked={checked.has(i)} onChange={() => toggle(i)} />
                  <span>
                    <b>
                      Шаг {i + 1} из {recipe.steps.length}
                    </b>
                    <StepText text={recipe.steps[i]} recipeTitle={recipe.title} />
                  </span>
                </label>
              </li>
            ))}
          </ol>
        ) : (
          <p>В ссылке нет шагов — попроси прислать ещё раз.</p>
        )}
      </section>

      <section className="recipe__section">
        <h2>Продукты на {servingsLabel(servings)}</h2>
        <ul className="together-page__ingredients">
          {scaleIngredients(recipe, servings).map((it) => (
            <li key={it.id}>
              <span>{ingredientMap[it.id]?.name ?? it.id}</span>
              <b>{formatAmount(ingredientMap[it.id], it.grams)}</b>
            </li>
          ))}
          {recipe.extras?.map((e) => (
            <li key={e.name}>
              <span>{e.name}</span>
              <b>{e.amount}</b>
            </li>
          ))}
        </ul>
      </section>

      <Link to={`/recipe/${recipe.id}`} className="btn btn--ghost together-page__full">
        Весь рецепт
      </Link>
    </main>
  );
}
