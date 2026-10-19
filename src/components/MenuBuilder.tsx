import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { recipes, servingMacros } from "../data";
import { buildMenu } from "../lib/menu";
import { fitsDiet } from "../lib/diet";
import { round } from "../lib/nutrition";
import { useStore } from "../hooks/useStore";
import { Stepper } from "./Stepper";

/** Подбор меню на день под цель по калориям и белку с учётом ограничений в еде. */
export function MenuBuilder() {
  const { goal, proteinGoal, setProteinGoal, exclude, favorites, addToDay, addToShopping, showToast } = useStore();
  const location = useLocation();
  const [seed, setSeed] = useState<number | null>(null);

  const menu = useMemo(() => {
    if (seed == null) return null;
    const pool = recipes.filter((r) => fitsDiet(r, exclude));
    return buildMenu(pool, servingMacros, { kcal: goal, minProtein: proteinGoal, seed, favorites });
  }, [seed, goal, proteinGoal, exclude, favorites]);
  const t = menu && round(menu.total);

  return (
    <section className="menu" aria-labelledby="menu-title">
      <h2 id="menu-title" className="menu__title">
        Меню на день
      </h2>
      <p className="page-sub">
        Подберём завтрак, обед, ужин и перекус на {goal} ккал. Цель по калориям меняется выше.
      </p>
      <div className="menu__goal">
        <span>Белка не меньше</span>
        <Stepper value={proteinGoal} onChange={setProteinGoal} min={30} max={250} step={5} label="Цель по белку" format={(v) => `${v} г`} />
      </div>

      {menu === null && seed != null ? (
        <p className="empty__title">Под эти ограничения не хватает рецептов. Попробуйте снять одно из них.</p>
      ) : null}

      {menu && t && (
        <>
          <ul className="menu__list">
            {menu.slots.map((s) => (
              <li key={s.label} className="menu__item">
                <span className="menu__slot">{s.label}</span>
                <Link to={`/recipe/${s.recipe.id}`} state={{ background: location }} className="menu__dish">
                  {s.recipe.title}
                </Link>
                <span className="menu__kcal">
                  {s.servings !== 1 && `${String(s.servings).replace(".", ",")} порции · `}
                  {Math.round(servingMacros[s.recipe.id].kcal * s.servings)} ккал
                </span>
              </li>
            ))}
          </ul>
          <p className="menu__total">
            Итого <b>{t.kcal} ккал</b>: белки {t.p} г, жиры {t.f} г, углеводы {t.c} г
          </p>
        </>
      )}

      <div className="menu__actions">
        <button type="button" className={`btn ${menu ? "btn--ghost" : "btn--accent"}`} onClick={() => setSeed((s) => (s == null ? Date.now() : s + 1))}>
          {menu ? "Другой вариант" : "Собрать меню"}
        </button>
        {menu && (
          <>
            <button
              type="button"
              className="btn btn--accent"
              onClick={() => {
                menu.slots.forEach((s) => addToDay(s.recipe.id, s.servings));
                showToast("Меню добавлено в «Мой день»");
              }}
            >
              Всё в мой день
            </button>
            <button
              type="button"
              className="btn btn--text"
              onClick={() => {
                // В покупки — минимум одну целую порцию: полпорции купить нельзя
                menu.slots.forEach((s) => addToShopping(s.recipe.id, Math.ceil(s.servings)));
                showToast("Продукты на меню добавлены в покупки");
              }}
            >
              Продукты в покупки
            </button>
          </>
        )}
      </div>
    </section>
  );
}
