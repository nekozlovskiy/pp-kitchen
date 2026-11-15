import { useState } from "react";
import { Link } from "react-router-dom";
import { recipes } from "../data";
import { plural } from "../lib/format";
import { RecipeCard } from "../components/RecipeCard";
import { useStore } from "../hooks/useStore";
import { OrdersList } from "../components/Orders";

export function Favorites() {
  const { favorites, myRecipes, coupleLikes } = useStore();
  // Свои рецепты не в каталоге, поэтому добавляем их отдельно — иначе счётчик на вкладке и список разойдутся.
  const [filter, setFilter] = useState("saved");
  const list = [...recipes, ...myRecipes].filter((r) => filter === "saved" ? favorites.has(r.id) :
    filter === "both" ? coupleLikes[r.id]?.anya && coupleLikes[r.id]?.danya :
    filter === "anya" ? coupleLikes[r.id]?.anya : coupleLikes[r.id]?.danya);
  return (
    <main className="wrap">
      <header className="page-head">
        <h1 className="page-title">Избранное</h1>
        <p className="page-sub">
          {list.length
            ? `${list.length} ${plural(list.length, ["любимый рецепт", "любимых рецепта", "любимых рецептов"])}`
            : filter === "saved" ? "Здесь будут рецепты, отмеченные сердечком." : "В этой подборке пока нет блюд."}
        </p>
      </header>
      <div className="toggles keepsake-tabs" role="group" aria-label="Любимые блюда">
        {[["saved", "С сердечком"], ["anya", "Анюта любит"], ["danya", "Даня любит"], ["both", "Любим оба"]].map(([id, label]) =>
          <button key={id} type="button" className={`toggle ${filter === id ? "is-on" : ""}`} aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>)}
      </div>
      <p className="journal__hint">В рецепте можно отметить любимое за каждого из вас. Отметки хранятся на этом устройстве.</p>
      <OrdersList />
      <Link to="/kitchen" className="pantry-link">
        <span>
          <b>Моя кухня</b>
          <span>Что и когда готовила, цифры и достижения</span>
        </span>
        <span aria-hidden="true">→</span>
      </Link>
      <Link to="/my" className="pantry-link">
        <span>
          <b>Мои рецепты</b>
          <span>Свои блюда с подсчётом КБЖУ</span>
        </span>
        <span aria-hidden="true">→</span>
      </Link>
      {list.length ? (
        <div className="grid">
          {list.map((r) => (
            <RecipeCard key={r.id} recipe={r} />
          ))}
        </div>
      ) : (
        <div className="empty">
          <p className="empty__title">Пока ничего не отмечено</p>
          <p>{filter === "saved" ? "Нажмите на сердечко у понравившегося блюда, и оно появится здесь." : "Откройте рецепт и отметьте, кому он нравится, в разделе «Наши любимые»."}</p>
          <Link to="/" className="btn btn--accent">
            Смотреть рецепты
          </Link>
        </div>
      )}
    </main>
  );
}
