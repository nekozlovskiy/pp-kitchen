import { Link } from "react-router-dom";
import { recipes } from "../data";
import { plural } from "../lib/format";
import { RecipeCard } from "../components/RecipeCard";
import { useStore } from "../hooks/useStore";

export function Favorites() {
  const { favorites, myRecipes } = useStore();
  // Свои рецепты не в каталоге, поэтому добавляем их отдельно — иначе счётчик на вкладке и список разойдутся.
  const list = [...recipes, ...myRecipes].filter((r) => favorites.has(r.id));
  return (
    <main className="wrap">
      <header className="page-head">
        <h1 className="page-title">Избранное</h1>
        <p className="page-sub">
          {list.length
            ? `${list.length} ${plural(list.length, ["любимый рецепт", "любимых рецепта", "любимых рецептов"])}`
            : "Здесь будут рецепты, отмеченные сердечком."}
        </p>
      </header>
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
          <p>Нажмите на сердечко у понравившегося блюда, и оно появится здесь.</p>
          <Link to="/" className="btn btn--accent">
            Смотреть рецепты
          </Link>
        </div>
      )}
    </main>
  );
}
