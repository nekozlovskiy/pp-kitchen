import { Link } from "react-router-dom";
import { Art } from "../art/Art";

export function NotFound() {
  return (
    <main className="wrap notfound">
      <Art className="notfound__art" kind="plate" category="snack" seed="404" />
      <h1 className="page-title">Тарелка пуста</h1>
      <p className="page-sub">Такой страницы нет. Зато рецептов здесь много.</p>
      <Link to="/" className="btn btn--accent">
        К рецептам
      </Link>
    </main>
  );
}
