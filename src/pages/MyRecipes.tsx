import { useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { categories, ingredientMap, ingredients, recipeMap } from "../data";
import { formatAmount, plural, servingsLabel } from "../lib/format";
import { perServing, round } from "../lib/nutrition";
import { draftProblem, isMyRecipe, makeMyRecipe } from "../lib/myRecipes";
import type { MyRecipeDraft } from "../lib/myRecipes";
import { RecipeCard } from "../components/RecipeCard";
import { Stepper } from "../components/Stepper";
import { useStore } from "../hooks/useStore";
import type { Category } from "../types";

/** Список своих рецептов. */
export function MyRecipes() {
  const { myRecipes } = useStore();
  return (
    <main className="wrap">
      <header className="page-head">
        <h1 className="page-title">Мои рецепты</h1>
        <p className="page-sub">
          {myRecipes.length
            ? `${myRecipes.length} ${plural(myRecipes.length, ["свой рецепт", "своих рецепта", "своих рецептов"])}. КБЖУ посчитано по таблице продуктов сайта.`
            : "Свои блюда: состав из таблицы продуктов, КБЖУ посчитается само. Хранятся только на этом телефоне."}
        </p>
      </header>
      <Link to="/my/new" className="btn btn--accent my__new">
        Новый рецепт
      </Link>
      {myRecipes.length ? (
        <div className="grid">
          {myRecipes.map((r) => (
            <RecipeCard key={r.id} recipe={r} />
          ))}
        </div>
      ) : (
        <div className="empty">
          <p className="empty__title">Пока ни одного</p>
          <p>Запишите любимое домашнее блюдо — его можно будет добавлять в «Мой день», покупки и меню недели, как рецепты с сайта.</p>
        </div>
      )}
    </main>
  );
}

const norm = (s: string) => s.toLowerCase().replace(/ё/g, "е");
const sortedIngredients = [...ingredients].sort((a, b) => a.name.localeCompare(b.name, "ru"));

function emptyDraft(): MyRecipeDraft {
  return { title: "", category: "dinner", servings: 2, timeMinutes: 30, description: "", ingredients: [], steps: [] };
}

/** Редактор своего рецепта: новый или существующий (/my/:id). */
export function MyRecipeEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { saveMyRecipe, deleteMyRecipe, showToast } = useStore();
  const existing = id && isMyRecipe(id) ? recipeMap[id] : undefined;
  const [draft, setDraft] = useState<MyRecipeDraft>(() =>
    existing
      ? { ...existing, description: existing.description ?? "", ingredients: existing.ingredients.map((i) => ({ ...i })) }
      : emptyDraft(),
  );
  const [stepsText, setStepsText] = useState(() => (existing ? existing.steps.join("\n") : ""));
  const [q, setQ] = useState("");
  const search = useRef<HTMLInputElement>(null);
  const [tried, setTried] = useState(false);

  if (id && !existing) {
    return (
      <main className="wrap">
        <div className="empty">
          <p className="empty__title">Такого рецепта нет</p>
          <Link to="/my" className="btn btn--accent">
            К моим рецептам
          </Link>
        </div>
      </main>
    );
  }

  const set = <K extends keyof MyRecipeDraft>(k: K, v: MyRecipeDraft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const full: MyRecipeDraft = { ...draft, steps: stepsText.split("\n") };
  const problem = draftProblem(full);
  const preview = round(perServing(makeMyRecipe(full), ingredientMap));
  const query = norm(q.trim());
  const used = new Set(draft.ingredients.map((i) => i.id));
  const found = query ? sortedIngredients.filter((i) => !used.has(i.id) && norm(i.name).includes(query)).slice(0, 8) : [];

  const save = () => {
    setTried(true);
    if (problem) return;
    const recipe = makeMyRecipe(full);
    saveMyRecipe(recipe);
    showToast(existing ? "Рецепт сохранён" : "Рецепт добавлен в «Мои рецепты»");
    navigate(`/recipe/${recipe.id}`, { replace: true });
  };

  return (
    <main className="wrap my-editor">
      <header className="page-head">
        <h1 className="page-title">{existing ? "Изменить рецепт" : "Новый рецепт"}</h1>
        <p className="page-sub">КБЖУ считается по таблице продуктов сайта. Рецепт хранится только на этом телефоне.</p>
      </header>

      <label className="field">
        <span>Название</span>
        <input type="text" value={draft.title} onChange={(e) => set("title", e.target.value)} placeholder="Например: мамины сырники" maxLength={120} />
      </label>

      <div className="field">
        <span>Раздел</span>
        <div className="toggles" role="group" aria-label="Раздел">
          {categories.map((c) => (
            <button key={c.id} type="button" className={`toggle ${draft.category === c.id ? "is-on" : ""}`} aria-pressed={draft.category === c.id} onClick={() => set("category", c.id as Category)}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="my-editor__row">
        <div className="field">
          <span>Порций</span>
          <Stepper value={draft.servings} onChange={(v) => set("servings", v)} min={1} max={20} label="Число порций" format={servingsLabel} />
        </div>
        <label className="field">
          <span>Время, минут</span>
          <input type="number" inputMode="numeric" min={1} max={1440} value={draft.timeMinutes || ""} onChange={(e) => set("timeMinutes", Number(e.target.value))} />
        </label>
      </div>

      <label className="field">
        <span>Коротко о блюде (по желанию)</span>
        <textarea rows={2} value={draft.description} onChange={(e) => set("description", e.target.value)} maxLength={300} />
      </label>

      <section className="field" aria-labelledby="my-ings">
        <span id="my-ings">Продукты на все порции</span>
        {draft.ingredients.length > 0 && (
          <ul className="my-editor__ings">
            {draft.ingredients.map((it, i) => {
              const ing = ingredientMap[it.id];
              return (
                <li key={it.id}>
                  <span className="my-editor__ing-name">{ing?.name ?? it.id}</span>
                  <label className="grams-input">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={5000}
                      value={it.grams || ""}
                      onChange={(e) => set("ingredients", draft.ingredients.map((x, j) => (j === i ? { ...x, grams: Number(e.target.value) } : x)))}
                      aria-label={`Вес: ${ing?.name}`}
                    />
                    <span>{ing?.unit === "ml" ? "мл" : "г"}</span>
                  </label>
                  <button type="button" className="btn btn--text" onClick={() => set("ingredients", draft.ingredients.filter((_, j) => j !== i))} aria-label={`Убрать ${ing?.name}`}>
                    Убрать
                  </button>
                  {ing?.piece && it.grams > 0 && <small className="my-editor__hint">{formatAmount(ing, it.grams)}</small>}
                </li>
              );
            })}
          </ul>
        )}
        <input ref={search} type="search" className="dislikes__search" placeholder="Добавить продукт: курица, рис, творог…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Найти продукт" />
        {query && (
          <div className="toggles">
            {found.length ? (
              found.map((i) => (
                <button
                  key={i.id}
                  type="button"
                  className="toggle"
                  onClick={() => {
                    set("ingredients", [...draft.ingredients, { id: i.id, grams: i.piece?.grams ?? 100 }]);
                    setQ("");
                    search.current?.focus();
                  }}
                >
                  {i.name}
                </button>
              ))
            ) : (
              <p className="diet__hint">Такого продукта нет в таблице. Специи, зелень и соль можно не добавлять — они почти не влияют на КБЖУ.</p>
            )}
          </div>
        )}
      </section>

      <label className="field">
        <span>Шаги — каждый с новой строки</span>
        <textarea rows={6} value={stepsText} onChange={(e) => setStepsText(e.target.value)} placeholder={"Нарежьте овощи.\nОбжарьте 5 минут.\nЗапекайте 20 минут при 180 °C."} />
      </label>

      <p className="my-editor__preview" aria-live="polite">
        На порцию: <b>{preview.kcal} ккал</b> · Б {preview.p} · Ж {preview.f} · У {preview.c}
      </p>
      {tried && problem && (
        <p className="my-editor__problem" role="alert">
          {problem}
        </p>
      )}

      <div className="my-editor__actions">
        <button type="button" className="btn btn--accent" onClick={save}>
          Сохранить
        </button>
        <Link to={existing ? `/recipe/${existing.id}` : "/my"} className="btn btn--ghost">
          Отмена
        </Link>
        {existing && (
          <button
            type="button"
            className="btn btn--text my-editor__delete"
            onClick={() => {
              if (!window.confirm(`Удалить «${existing.title}»? Его не будет и в «Моём дне», покупках и меню.`)) return;
              deleteMyRecipe(existing.id);
              showToast("Рецепт удалён");
              navigate("/my", { replace: true });
            }}
          >
            Удалить рецепт
          </button>
        )}
      </div>
    </main>
  );
}
