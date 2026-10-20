import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { config } from "../config";
import { ingredientMap, ingredients, portionGrams, recipeMap } from "../data";
import { foodsMacros } from "../hooks/useStore";
import { round, scale, sum } from "../lib/nutrition";
import { plural, todayKey } from "../lib/format";
import { MacroRing } from "../components/MacroRing";
import { Stepper } from "../components/Stepper";
import { useStore } from "../hooks/useStore";
import { MenuBuilder } from "../components/MenuBuilder";
import { WeekChart } from "../components/WeekChart";

const yesterdayKey = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return todayKey(d);
};
const lastDayLabel = (date: string) =>
  date === yesterdayKey() ? "Вчера" : new Date(`${date}T12:00:00`).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });

const norm = (s: string) => s.toLowerCase().replace(/ё/g, "е");
const allIngredients = [...ingredients].sort((a, b) => a.name.localeCompare(b.name, "ru"));

/**
 * Вес продукта в «Моём дне». Пока в поле печатают, оно своё; если вес поменялся снаружи
 * (тот же продукт добавили ещё раз) — подтягивает новое значение.
 */
function FoodGrams({ grams, unit, label, onChange }: { grams: number; unit: string; label: string; onChange: (v: number) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(String(Math.round(grams)));
  useEffect(() => {
    if (document.activeElement !== ref.current) setText(String(Math.round(grams)));
  }, [grams]);
  return (
    <label className="grams-input">
      <input
        ref={ref}
        type="number"
        inputMode="numeric"
        min={1}
        max={3000}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          const v = Number(e.target.value);
          if (v > 0 && v <= 3000) onChange(v);
        }}
        onBlur={() => setText(String(Math.round(grams)))}
        aria-label={label}
      />
      <span>{unit}</span>
    </label>
  );
}

/** Продукт без рецепта: поиск по таблице продуктов, вес по умолчанию — одна штука или 100 г. */
function FoodPicker() {
  const { addFood, showToast } = useStore();
  const [q, setQ] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const query = norm(q.trim());
  const found = query ? allIngredients.filter((i) => norm(i.name).includes(query)).slice(0, 8) : [];
  return (
    <section className="food-picker" aria-labelledby="food-picker-title">
      <h2 id="food-picker-title" className="food-picker__title">
        Продукт без рецепта
      </h2>
      <input
        ref={input}
        type="search"
        className="dislikes__search"
        placeholder="Яблоко, кефир, творог…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="Найти продукт"
      />
      {query && (
        <div className="toggles">
          {found.length ? (
            found.map((i) => (
              <button
                key={i.id}
                type="button"
                className="toggle"
                onClick={() => {
                  const grams = i.piece?.grams ?? 100;
                  addFood(i.id, grams);
                  showToast(`${i.name}: ${grams} ${i.unit === "ml" ? "мл" : "г"} в моём дне`);
                  setQ("");
                  input.current?.focus();
                }}
              >
                {i.name}
              </button>
            ))
          ) : (
            <p className="diet__hint">Такого продукта нет в таблице.</p>
          )}
        </div>
      )}
    </section>
  );
}

export function Day() {
  const { day, setDayServings, toggleDayUnit, removeFromDay, clearDay, goal, setGoal, servingFor, foods, setFoodGrams, removeFood, lastDay, repeatLastDay } = useStore();
  const location = useLocation();
  const totalsRaw = sum([...day.map((x) => scale(servingFor(x.id), x.servings)), foodsMacros(foods)]);
  const t = round(totalsRaw);
  const left = goal - t.kcal;
  const progress = Math.min(100, (t.kcal / goal) * 100);

  return (
    <main className="day wrap">
      <header className="page-head">
        <h1 className="page-title">Мой день</h1>
        <p className="page-sub">Что вы съели сегодня. Можно считать порциями или взвесить тарелку и ввести граммы. Список очищается сам в полночь, а итог дня остаётся на графике за неделю.</p>
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

      {!day.length && !foods.length && lastDay && (
        <div className="repeat-day">
          <p>
            {lastDayLabel(lastDay.date)}: {lastDay.items.map((x) => recipeMap[x.id]?.title).concat(lastDay.foods.map((f) => ingredientMap[f.id]?.name)).filter(Boolean).join(", ")}
          </p>
          <button type="button" className="btn btn--accent" onClick={repeatLastDay}>
            {lastDay.date === yesterdayKey() ? "Повторить вчера" : "Повторить этот день"}
          </button>
        </div>
      )}

      {day.length || foods.length ? (
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
            {foods.map((f, i) => {
              const ing = ingredientMap[f.id];
              const unit = ing.unit === "ml" ? "мл" : "г";
              return (
                <li key={f.id} className="day__item">
                  <div className="day__item-main">
                    <span className="day__item-title">{ing.name}</span>
                    <span className="day__item-kcal">{Math.round((ing.per100.kcal * f.grams) / 100)} ккал</span>
                  </div>
                  <div className="day__item-ctrl">
                    <FoodGrams grams={f.grams} unit={unit} label={`Сколько ${unit}: ${ing.name}`} onChange={(v) => setFoodGrams(i, v)} />
                    <button type="button" className="btn btn--text" onClick={() => removeFood(i)} aria-label={`Убрать «${ing.name}»`}>
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
          <p>Откройте рецепт и нажмите «В мой день», чтобы посчитать калории за день. Перекус без рецепта можно добавить ниже.</p>
          <Link to="/" className="btn btn--accent">
            Выбрать рецепт
          </Link>
        </div>
      )}

      <FoodPicker />

      <WeekChart />

      <MenuBuilder />

      <p className="disclaimer">{config.disclaimer}</p>
    </main>
  );
}
