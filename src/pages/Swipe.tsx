import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import type { Location } from "react-router-dom";
import { categories, isProteinDense, recipeMap, recipes, servingMacros } from "../data";
import { fitsDiet } from "../lib/diet";
import { formatTime } from "../lib/format";
import { askToCook } from "../lib/cookForMe";
import { buildDeck, ensureToday, moods, readSwipeDay, saveSwipeDay, type SwipeDay } from "../lib/moodDeck";
import { Art } from "../art/Art";
import { useStore } from "../hooks/useStore";
import type { Category, Recipe } from "../types";

const SWIPE_PX = 90;

/** Карточка, которую можно смахнуть пальцем: вправо — «хочу», влево — «не сегодня». */
function SwipeCard({ recipe, onDecide }: { recipe: Recipe; onDecide: (like: boolean) => void }) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef(0);
  const m = servingMacros[recipe.id];
  const end = () => {
    if (!dragging) return;
    setDragging(false);
    if (Math.abs(dx) > SWIPE_PX) onDecide(dx > 0);
    setDx(0);
  };
  return (
    <div
      className={`swipe-card ${dx > SWIPE_PX ? "is-like" : dx < -SWIPE_PX ? "is-skip" : ""}`}
      style={{ transform: `translateX(${dx}px) rotate(${dx / 18}deg)`, transition: dragging ? "none" : "transform .2s" }}
      onPointerDown={(e) => {
        start.current = e.clientX;
        setDragging(true);
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => dragging && setDx(e.clientX - start.current)}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <Art className="swipe-card__art" kind={recipe.art} category={recipe.category} seed={recipe.id} />
      <h2 className="swipe-card__title">{recipe.title}</h2>
      <p className="swipe-card__meta">
        {Math.round(m.kcal)} ккал · Б {Math.round(m.p)} · {formatTime(recipe.timeMinutes)}
      </p>
      <p className="swipe-card__desc">{recipe.description}</p>
    </div>
  );
}

/** «Чего хочется?»: настроение, затем короткая колода, в конце — список отмеченного. */
export function Swipe() {
  const { exclude, dislikes, addToDay, showToast } = useStore();
  const location = useLocation();
  const [category, setCategory] = useState<Category | "all">("all");
  const [day, setDay] = useState<SwipeDay>(() => readSwipeDay());
  const [deck, setDeck] = useState<Recipe[] | null>(null);
  const [index, setIndex] = useState(0);
  const [mood, setMood] = useState("any");

  const update = (next: SwipeDay) => {
    setDay(next);
    saveSwipeDay(next);
  };
  // Экран могли оставить открытым через полночь: при возврате в приложение начинаем новый день.
  useEffect(() => {
    const refresh = () => setDay((d) => ensureToday(d));
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  const today = (): SwipeDay => {
    const d = ensureToday(day);
    if (d !== day) setDay(d);
    return d;
  };
  const deal = (moodId: string) => {
    setMood(moodId);
    const pool = recipes.filter((r) => fitsDiet(r, exclude, dislikes));
    const d = today();
    const seen = new Set([...d.skipped, ...d.liked]);
    const ctx = (r: Recipe) => ({ macros: servingMacros[r.id], proteinDense: isProteinDense(r.id) });
    setDeck(buildDeck(pool, { category, mood: moodId, skipped: seen, ctx }));
    setIndex(0);
  };
  const decide = (like: boolean) => {
    if (!deck) return;
    const id = deck[index].id;
    const d = today();
    update(like ? { ...d, liked: [...d.liked, id] } : { ...d, skipped: [...d.skipped, id] });
    setIndex((i) => i + 1);
  };

  const liked = ensureToday(day).liked.map((id) => recipeMap[id]).filter(Boolean);
  const current = deck?.[index];
  const likedList = liked.length > 0 && (
    <LikedList
      liked={liked}
      location={location}
      onDay={(r) => {
        addToDay(r.id);
        showToast("Порция добавлена в «Мой день»");
      }}
      onAsk={(r) => askToCook(r, () => showToast("Просьба скопирована — отправь её в чат"))}
    />
  );

  if (!deck) {
    return (
      <main className="wrap swipe">
        <header className="page-head">
          <h1 className="page-title">Чего хочется?</h1>
          <p className="page-sub">Выбери настроение — покажу 10 подходящих блюд. Вправо — «хочу», влево — «не сегодня».</p>
        </header>
        <div className="toggles" role="group" aria-label="Раздел">
          {([["all", "Что угодно"], ...categories.map((c) => [c.id, c.label])] as [Category | "all", string][]).map(([id, label]) => (
            <button key={id} type="button" className={`toggle ${category === id ? "is-on" : ""}`} aria-pressed={category === id} onClick={() => setCategory(id)}>
              {label}
            </button>
          ))}
        </div>
        <div className="swipe__moods">
          {moods.map((m) => (
            <button key={m.id} type="button" className="swipe__mood" onClick={() => deal(m.id)}>
              {m.label}
            </button>
          ))}
        </div>
        {likedList}
      </main>
    );
  }

  return (
    <main className="wrap swipe">
      <header className="page-head">
        <h1 className="page-title">{moods.find((m) => m.id === mood)?.label}</h1>
        <p className="page-sub">{current ? `${index + 1} из ${deck.length}` : "Колода закончилась"}</p>
      </header>
      {current ? (
        <>
          <SwipeCard key={current.id} recipe={current} onDecide={decide} />
          <div className="swipe__buttons">
            <button type="button" className="swipe__btn" aria-label="Не сегодня" onClick={() => decide(false)}>
              ✕
            </button>
            <Link to={`/recipe/${current.id}`} state={{ background: location }} className="swipe__btn swipe__btn--small" aria-label="Открыть рецепт">
              i
            </Link>
            <button type="button" className="swipe__btn swipe__btn--like" aria-label="Хочу" onClick={() => decide(true)}>
              ♥
            </button>
          </div>
        </>
      ) : (
        <div className="empty">
          <p className="empty__title">{deck.length ? "Всё посмотрели" : "Под это настроение ничего не осталось"}</p>
          <div className="swipe__again">
            <button type="button" className="btn btn--accent" onClick={() => deal(mood)}>
              Ещё 10
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => setDeck(null)}>
              Другое настроение
            </button>
          </div>
        </div>
      )}
      {likedList}
    </main>
  );
}

function LikedList({
  liked,
  location,
  onDay,
  onAsk,
}: {
  liked: Recipe[];
  location: Location;
  onDay: (r: Recipe) => void;
  onAsk: (r: Recipe) => void;
}) {
  return (
    <section className="swipe__liked" aria-labelledby="liked-title">
      <h2 id="liked-title">Сегодня хочется</h2>
      <ul>
        {liked.map((r) => (
          <li key={r.id} className="swipe__liked-item">
            <Link to={`/recipe/${r.id}`} state={{ background: location }} className="swipe__liked-title">
              {r.title}
            </Link>
            <span className="swipe__liked-kcal">{Math.round(servingMacros[r.id].kcal)} ккал</span>
            <div className="swipe__liked-actions">
              <button type="button" className="btn btn--text" onClick={() => onDay(r)}>
                В мой день
              </button>
              <button type="button" className="btn btn--text" onClick={() => onAsk(r)}>
                Приготовь мне 🥺
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
