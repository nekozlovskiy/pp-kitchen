import { Link, useLocation } from "react-router-dom";
import { config } from "../config";
import { portionGrams, recipeMap } from "../data";
import { round, scale, sum } from "../lib/nutrition";
import { plural } from "../lib/format";
import { MacroRing } from "../components/MacroRing";
import { Stepper } from "../components/Stepper";
import { useStore } from "../hooks/useStore";
import { MenuBuilder } from "../components/MenuBuilder";

export function Day() {
  const { day, setDayServings, toggleDayUnit, removeFromDay, clearDay, goal, setGoal, servingFor } = useStore();
  const location = useLocation();
  const totalsRaw = sum(day.map((x) => scale(servingFor(x.id), x.servings)));
  const t = round(totalsRaw);
  const left = goal - t.kcal;
  const progress = Math.min(100, (t.kcal / goal) * 100);

  return (
    <main className="day wrap">
      <header className="page-head">
        <h1 className="page-title">Мой день</h1>
        <p className="page-sub">Что вы съели сегодня. Можно считать порциями или взвесить тарелку и ввести граммы. Список очищается сам в полночь.</p>
      </header>

      <section className="day__summary" aria-label="Итог дня">
        <div className="day__total">
          <p className="kcal kcal--xl">
            <span className="kcal__num">{t.kcal}</span>
            <span className="kcal__unit">из {goal} ккал</span>
          </p>
          <div className="meter" role="progressbar" aria-valuemin={0} aria-valuemax={goal} aria-valuenow={t.kcal} aria-label="Калории за день">
            <span style={{ width: `${progress}%` }} className={left < 0 ? "is-over" : ""} />
          </div>
          <p className="day__left">
            {left >= 0 ? `Осталось ${left} ккал` : `Больше цели на ${-left} ккал`}
          </p>
        </div>
        <div className="day__macros">
          <MacroRing macros={totalsRaw} size={96} stroke={11} />
          <dl className="macros macros--compact">
            <div className="macros__row">
              <dt>
                <i className="dot dot--p" /> Белки
              </dt>
              <dd>
                <b>{t.p} г</b>
              </dd>
            </div>
            <div className="macros__row">
              <dt>
                <i className="dot dot--f" /> Жиры
              </dt>
              <dd>
                <b>{t.f} г</b>
              </dd>
            </div>
            <div className="macros__row">
              <dt>
                <i className="dot dot--c" /> Углеводы
              </dt>
              <dd>
                <b>{t.c} г</b>
              </dd>
            </div>
          </dl>
        </div>
        <div className="day__goal">
          <span>Цель на день</span>
          <Stepper value={goal} onChange={setGoal} min={800} max={5000} step={50} label="Цель по калориям" format={(v) => `${v} ккал`} />
        </div>
      </section>

      {day.length ? (
        <>
          <ul className="day__list">
            {day.map((x, i) => {
              const r = recipeMap[x.id];
              const kcal = Math.round(servingFor(x.id).kcal * x.servings);
              return (
                <li key={x.id} className="day__item">
                  <div className="day__item-main">
                    <Link to={`/recipe/${x.id}`} state={{ background: location }} className="day__item-title">
                      {r.title}
                    </Link>
                    <span className="day__item-kcal">{kcal} ккал</span>
                  </div>
                  <div className="day__item-ctrl">
                    {x.grams ? (
                      <label className="grams-input">
                        <input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={3000}
                          defaultValue={Math.round(x.servings * portionGrams[x.id])}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            if (v > 0 && v <= 3000) setDayServings(i, v / portionGrams[x.id]);
                          }}
                          aria-label={`Сколько граммов: ${r.title}`}
                        />
                        <span>г</span>
                      </label>
                    ) : (
                      <Stepper
                        value={x.servings}
                        onChange={(v) => setDayServings(i, v)}
                        min={0.5}
                        max={10}
                        step={0.5}
                        label={`Порции: ${r.title}`}
                        format={(v) => `${String(Math.round(v * 100) / 100).replace(".", ",")} ${plural(Math.ceil(v), ["порция", "порции", "порций"])}`}
                      />
                    )}
                    <button
                      type="button"
                      className="btn btn--text"
                      onClick={() => {
                        // При переходе на порции округляем до половинки, чтобы степпер шагал ровно.
                        if (x.grams) setDayServings(i, Math.max(0.5, Math.round(x.servings * 2) / 2));
                        toggleDayUnit(i);
                      }}
                    >
                      {x.grams ? "В порциях" : "В граммах"}
                    </button>
                    <button type="button" className="btn btn--text" onClick={() => removeFromDay(i)} aria-label={`Убрать «${r.title}»`}>
                      Убрать
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          <button type="button" className="btn btn--ghost" onClick={clearDay}>
            Очистить день
          </button>
        </>
      ) : (
        <div className="empty">
          <p className="empty__title">Сегодня пока пусто</p>
          <p>Откройте рецепт и нажмите «В мой день», чтобы посчитать калории за день.</p>
          <Link to="/" className="btn btn--accent">
            Выбрать рецепт
          </Link>
        </div>
      )}

      <MenuBuilder />

      <p className="disclaimer">{config.disclaimer}</p>
    </main>
  );
}
