import { useCallback, useEffect, useRef, useState } from "react";
import { clearCooking, readCooking, saveCooking } from "../lib/cooking";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { categoryLabel, ingredientMap, per100Macros, portionGrams, recipeAliases, recipeMap, recipes, servingMacros, sources } from "../data";
import { makeSimilar } from "../lib/similar";
import { isMyRecipe } from "../lib/myRecipes";
import { askToCook } from "../lib/cookForMe";
import { shareOrCopy } from "../lib/share";
import { fitsDiet } from "../lib/diet";
import { macroPercents, per100g, round, scale, scaleIngredients } from "../lib/nutrition";
import { applySwaps, availableSwaps } from "../lib/swaps";
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
import { TogetherPanel } from "../components/TogetherPanel";
import { OrderPanel } from "../components/Orders";
import { readAssignment, saveAssignment } from "../lib/together";
import { RecipeJournal } from "../components/RecipeJournal";
import { StepText } from "../components/StepText";
import { ReelEmbed } from "../components/ReelEmbed";
import { WEEKDAYS } from "./Week";
import type { Recipe } from "../types";

/** Поделиться ссылкой на рецепт: системное меню на телефоне, копирование ссылки на компьютере. */
function ShareButton({ recipe, onCopied }: { recipe: Recipe; onCopied: () => void }) {
  const share = async () => {
    const url = `${location.origin}${location.pathname}#/recipe/${recipe.id}`;
    await shareOrCopy({ title: recipe.title, text: recipe.description, url }, url, onCopied);
  };
  return (
    <button type="button" className="heart heart--big" aria-label={`Поделиться рецептом «${recipe.title}»`} onClick={share}>
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path d="M12 15V4M8 8l4-4 4 4M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
      </svg>
    </button>
  );
}

/** «Приготовь мне»: Анюта отправляет тебе просьбу со ссылкой на рецепт. */
function CookForMeButton({ recipe, onCopied }: { recipe: Recipe; onCopied: () => void }) {
  return (
    <button type="button" className="btn btn--ghost recipe__ask" onClick={() => askToCook(recipe, onCopied)}>
      Приготовь мне 🥺
    </button>
  );
}

const similar = makeSimilar(recipes);

/** Похожие блюда внизу рецепта. Переход заменяет текущий рецепт, чтобы «Закрыть» возвращало в каталог. */
function SimilarRecipes({ recipe }: { recipe: Recipe }) {
  const { exclude, dislikes } = useStore();
  const location = useLocation();
  const list = similar(recipe, 4, (r) => fitsDiet(r, exclude, dislikes));
  if (!list.length) return null;
  return (
    <section className="recipe__section similar" aria-labelledby="similar-title">
      <h2 id="similar-title">Похожие рецепты</h2>
      <ul className="similar__list">
        {list.map((r) => (
          <li key={r.id}>
            <Link to={`/recipe/${r.id}`} state={location.state} replace className="similar__item">
              <Art className="similar__art" kind={r.art} category={r.category} seed={r.id} />
              <span className="similar__title">{r.title}</span>
              <span className="similar__kcal">{Math.round(servingMacros[r.id].kcal)} ккал</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function RecipeBody({ recipe }: { recipe: Recipe }) {
  const { addToDay, addToShopping, addToWeek, showToast, journal, swaps, toggleSwap, servingFor, goal, proteinGoal } = useStore();
  // Если этот рецепт уже готовится — продолжаем с тех же отметок, шага и числа порций.
  const [resume] = useState(() => {
    const c = readCooking();
    return c?.id === recipe.id ? c : null;
  });
  const [servings, setServings] = useState(resume?.servings ?? recipe.servings);
  const [together, setTogether] = useState(false);
  const [partnerSteps, setPartnerSteps] = useState<Set<number>>(() => new Set(readAssignment(recipe.id, recipe.steps.length)));
  const [checked, setChecked] = useState<Set<number>>(() => new Set(resume?.checked ?? []));
  const [cookStep, setCookStep] = useState(resume?.step ?? 0);
  // Готовка начинается с первой отметки продукта или с пошагового режима, а не с открытия рецепта.
  const started = useRef(Boolean(resume));
  useEffect(() => {
    if (started.current) saveCooking({ id: recipe.id, checked: [...checked], step: cookStep, servings });
  }, [recipe.id, checked, cookStep, servings]);
  const onCookStep = useCallback((s: number) => {
    started.current = true;
    setCookStep(s);
  }, []);
  const resetCooking = () => {
    started.current = false;
    clearCooking();
    setChecked(new Set());
    setCookStep(0);
  };
  const [keepAwake, setKeepAwake] = useState(false);
  const [showMacros, setShowMacros] = useState(false);
  const [cooking, setCooking] = useState(false);
  const wake = useWakeLock(keepAwake);
  const photo = usePhotoUrl(recipe.id, journal[recipe.id]?.photo);
  const closeCook = useCallback(() => setCooking(false), []);
  const active = swaps[recipe.id] ?? [];
  const options = availableSwaps(recipe);
  // Рецепт с заменами продуктов: от него считаются КБЖУ, граммы и шаги готовки.
  const cooked = applySwaps(recipe, active);
  // Своя порция в граммах: КБЖУ пересчитываются от веса стандартной порции.
  const [myGrams, setMyGrams] = useState<number | null>(null);
  const baseGrams = portionGrams[recipe.id];
  const portionK = myGrams ? myGrams / baseGrams : 1;
  const serving = scale(servingFor(recipe.id), portionK);
  const m = round(serving);
  const m100 = round(active.length ? per100g(cooked, ingredientMap) : per100Macros[recipe.id]);
  const pc = macroPercents(serving);
  const items = scaleIngredients(cooked, servings);

  const toggle = (i: number) => {
    started.current = true;
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  return (
    <article className="recipe">
      {/* Заказ — первым: у него по ссылке-заказу кнопки ответа сразу на виду. */}
      <OrderPanel recipe={recipe} />
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
            <small>≈ {portionGrams[recipe.id]} г</small>
          </li>
        </ul>
      </header>

      {recipe.video && <ReelEmbed url={recipe.video} title={recipe.title} />}

      <section className="nutrition" aria-label={myGrams ? `Пищевая ценность ${myGrams} г` : "Пищевая ценность одной порции"}>
        <div className="my-portion">
          <label className="grams-input">
            <span>Моя порция</span>
            <input
              key={myGrams === null ? "base" : "own"}
              type="number"
              inputMode="numeric"
              min={1}
              max={3000}
              defaultValue={myGrams ?? baseGrams}
              onChange={(e) => {
                const v = Math.round(Number(e.target.value));
                if (v > 0 && v <= 3000) setMyGrams(v === baseGrams ? null : v);
              }}
              aria-label="Вес моей порции в граммах"
            />
            <span>г</span>
          </label>
          {myGrams ? (
            <button type="button" className="btn btn--text" onClick={() => setMyGrams(null)}>
              Как в рецепте, {baseGrams} г
            </button>
          ) : (
            <small>Взвесьте тарелку и впишите свой вес</small>
          )}
        </div>
        <MacroRing macros={serving} size={148} stroke={14}>
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
        <p className="per100">
          <b>≈ {m100.kcal} ккал</b> в 100 г готового блюда
          <span>
            Б {m100.p} · Ж {m100.f} · У {m100.c} г
          </span>
        </p>
        {goal > 0 && (
          <p className="goal-share">
            {myGrams ? `${myGrams} г` : "Порция"} — это <b>{Math.round((serving.kcal / goal) * 100)}%</b> цели на день по калориям
            {proteinGoal > 0 && (
              <>
                {" "}и <b>{Math.round((serving.p / proteinGoal) * 100)}%</b> по белку
              </>
            )}
          </p>
        )}
      </section>

      <div className="recipe__actions">
        <button
          type="button"
          className="btn btn--accent"
          onClick={() => {
            if (myGrams) {
              addToDay(recipe.id, portionK, true);
              showToast(`${myGrams} г добавлено в «Мой день»`);
            } else {
              addToDay(recipe.id, 1);
              showToast("Порция добавлена в «Мой день»");
            }
          }}
        >
          В мой день
        </button>
        <ShareButton recipe={recipe} onCopied={() => showToast("Ссылка на рецепт скопирована")} />
        <HeartButton id={recipe.id} title={recipe.title} className="heart--big" />
      </div>
      {/* Свой рецепт живёт только на её телефоне: по ссылке он у тебя не откроется. */}
      {!isMyRecipe(recipe.id) && (
        <CookForMeButton recipe={recipe} onCopied={() => showToast("Просьба скопирована — отправь её в чат")} />
      )}

      <div className="cook-bar">
        <button type="button" className="btn btn--ghost" onClick={() => setCooking(true)}>
          {cookStep > 0 ? `Продолжить с шага ${Math.min(cookStep, recipe.steps.length)}` : "Готовить по шагам"}
        </button>
        {(cookStep > 0 || checked.size > 0) && (
          <button type="button" className="btn btn--text" onClick={resetCooking}>
            Начать заново
          </button>
        )}
        {!isMyRecipe(recipe.id) && (
          <button type="button" className="btn btn--ghost" aria-expanded={together} onClick={() => setTogether((v) => !v)}>
            Готовим вдвоём
          </button>
        )}
        {wake.supported && (
          <label className="switch">
            <input type="checkbox" checked={keepAwake} onChange={(e) => setKeepAwake(e.target.checked)} />
            <span>Не гасить экран</span>
          </label>
        )}
      </div>
      {together && (
        <TogetherPanel
          recipe={recipe}
          servings={servings}
          partnerSteps={partnerSteps}
          onChange={(steps) => {
            setPartnerSteps(new Set(steps));
            saveAssignment(recipe.id, steps);
          }}
          onCopied={() => showToast("Ссылка скопирована — отправь её в чат")}
        />
      )}
      {cooking && (
        <CookMode
          recipe={cooked}
          servings={servings}
          onClose={closeCook}
          initialStep={cookStep}
          onStep={onCookStep}
          onFinish={resetCooking}
          partnerSteps={partnerSteps}
        />
      )}

      <section className="recipe__section">
        <div className="recipe__section-head">
          <h2>Продукты</h2>
          <Stepper value={servings} onChange={setServings} label="Число порций" min={1} max={20} format={servingsLabel} />
        </div>
        <button type="button" className="btn btn--text ingredients__macros-toggle" aria-pressed={showMacros} onClick={() => setShowMacros((v) => !v)}>
          {showMacros ? "Скрыть КБЖУ продуктов" : "Показать КБЖУ продуктов"}
        </button>
        <ul className="ingredients">
          {items.map((it, i) => {
            const ing = ingredientMap[it.id];
            const k = it.grams / 100;
            return (
              <li key={it.id}>
                <label className={checked.has(i) ? "is-done" : ""}>
                  <input type="checkbox" checked={checked.has(i)} onChange={() => toggle(i)} />
                  <span className="ingredients__name">{ing?.name ?? it.id}</span>
                  <span className="ingredients__amount">{formatAmount(ing, it.grams)}</span>
                </label>
                {showMacros && ing && (
                  <p className="ingredients__macros">
                    {Math.round(ing.per100.kcal * k)} ккал · Б {Math.round(ing.per100.p * k)} · Ж {Math.round(ing.per100.f * k)} · У{" "}
                    {Math.round(ing.per100.c * k)}
                    <span> · в 100 г {Math.round(ing.per100.kcal)} ккал</span>
                  </p>
                )}
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
          <label className="select select--week">
            <span className="visually-hidden">Добавить в меню недели</span>
            <select
              value=""
              onChange={(e) => {
                const d = Number(e.target.value);
                if (e.target.value === "") return;
                addToWeek(d, recipe.id, 1);
                showToast(`Добавлено в меню: ${WEEKDAYS[d].toLowerCase()}`);
              }}
            >
              <option value="">В меню недели…</option>
              {WEEKDAYS.map((name, d) => (
                <option key={name} value={d}>
                  {name}
                </option>
              ))}
            </select>
          </label>
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
        {options.length ? (
          <div className="swaps">
            <p className="swaps__title">Заменить продукты</p>
            <div className="toggles">
              {options.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  className={`toggle ${active.includes(s.key) ? "is-on" : ""}`}
                  aria-pressed={active.includes(s.key)}
                  onClick={() => toggleSwap(recipe.id, s.key)}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <p className="swaps__hint">КБЖУ и продукты пересчитаются. Замена запомнится и попадёт в «Мой день» и покупки.</p>
          </div>
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
          {/* Ссылка на отдельную страницу рецепта, а не на статью-подборку */}
          {/\/recipe\/|\/recepty\/[^/]+\/[^/]+-\d+$/.test(sources[recipe.source].url) ? "Рецепт «" : "Рецепт из подборки «"}
          <a href={sources[recipe.source].url} target="_blank" rel="noopener noreferrer">
            {sources[recipe.source].title}
          </a>
          », {sources[recipe.source].site}, автор {sources[recipe.source].author}. КБЖУ посчитано нами по составу.
        </p>
      )}

      {isMyRecipe(recipe.id) && (
        <p className="source">
          Свой рецепт, КБЖУ посчитано по таблице продуктов. <Link to={`/my/${recipe.id}`}>Изменить или удалить</Link>
        </p>
      )}

      <SimilarRecipes recipe={recipe} />
    </article>
  );
}

export function RecipeSheet() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const recipe = recipeMap[recipeAliases[id] ?? id];
  const hasBackground = Boolean((location.state as { background?: unknown } | null)?.background);
  // Переход к похожему рецепту открывает его с начала, а не с того места, где листали предыдущий.
  useEffect(() => {
    document.querySelector(".sheet__panel")?.scrollTo({ top: 0 });
  }, [recipe?.id]);

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
