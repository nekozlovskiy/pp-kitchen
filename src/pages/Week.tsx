import { Link, useLocation } from "react-router-dom";
import { recipeMap, recipes, servingMacros } from "../data";
import { buildMenu } from "../lib/menu";
import { fitsDiet } from "../lib/diet";
import { useStore } from "../hooks/useStore";

export const WEEKDAYS = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];

/** Номер сегодняшнего дня недели, понедельник — 0. */
export const todayIndex = () => (new Date().getDay() + 6) % 7;

export function Week() {
  const { week, setWeek, removeFromWeek, clearWeek, addToDay, addToShopping, showToast, goal, proteinGoal, exclude, dislikes, favorites, servingFor } =
    useStore();
  const location = useLocation();
  const today = todayIndex();
  const planned = week.some((d) => d.length);

  const autofill = () => {
    const pool = recipes.filter((r) => fitsDiet(r, exclude, dislikes));
    const base = Date.now();
    const days = WEEKDAYS.map((_, i) => {
      const menu = buildMenu(pool, servingMacros, { kcal: goal, minProtein: proteinGoal, seed: base + i * 7919, favorites });
      return menu ? menu.slots.map((s) => ({ id: s.recipe.id, servings: s.servings })) : [];
    });
    setWeek(days);
    showToast("Меню на неделю подобрано");
  };

  return (
    <main className="week wrap">
      <header className="page-head">
        <h1 className="page-title">Меню на неделю</h1>
        <p className="page-sub">
          Добавляйте блюда из рецептов кнопкой «В меню недели» или подберите всё сразу на {goal} ккал в день. Цель меняется в «Моём дне».
        </p>
      </header>

      <div className="week__actions">
        <button type="button" className={`btn ${planned ? "btn--ghost" : "btn--accent"}`} onClick={autofill}>
          {planned ? "Подобрать заново" : "Подобрать на всю неделю"}
        </button>
        {planned && (
          <>
            <button
              type="button"
              className="btn btn--accent"
              onClick={() => {
                // В покупки — целые порции: полпорции купить нельзя
                week.forEach((d) => d.forEach((x) => addToShopping(x.id, Math.ceil(x.servings))));
                showToast("Продукты на неделю добавлены в покупки");
              }}
            >
              Все продукты в покупки
            </button>
            <button type="button" className="btn btn--text" onClick={clearWeek}>
              Очистить неделю
            </button>
          </>
        )}
      </div>

      <ol className="week__days">
        {WEEKDAYS.map((name, d) => {
          const items = week[d];
          const kcal = Math.round(items.reduce((a, x) => a + servingFor(x.id).kcal * x.servings, 0));
          return (
            <li key={name} className={`week__day ${d === today ? "is-today" : ""}`}>
              <div className="week__day-head">
                <h2>
                  {name}
                  {d === today && <span className="week__today">сегодня</span>}
                </h2>
                {items.length > 0 && <span className="week__kcal">{kcal} ккал</span>}
              </div>
              {items.length ? (
                <>
                  <ul className="week__list">
                    {items.map((x, i) => (
                      <li key={`${x.id}-${i}`}>
                        <Link to={`/recipe/${x.id}`} state={{ background: location }}>
                          {recipeMap[x.id].title}
                        </Link>
                        <span className="week__meta">
                          {x.servings !== 1 && `${String(x.servings).replace(".", ",")} порции · `}
                          {Math.round(servingFor(x.id).kcal * x.servings)} ккал
                        </span>
                        <button type="button" className="week__remove" onClick={() => removeFromWeek(d, i)} aria-label={`Убрать «${recipeMap[x.id].title}» из дня «${name}»`}>
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    className="btn btn--text"
                    onClick={() => {
                      items.forEach((x) => addToDay(x.id, x.servings));
                      showToast(`${name}: блюда добавлены в «Мой день»`);
                    }}
                  >
                    В мой день
                  </button>
                </>
              ) : (
                <p className="week__empty">Пока ничего не запланировано</p>
              )}
            </li>
          );
        })}
      </ol>
    </main>
  );
}
