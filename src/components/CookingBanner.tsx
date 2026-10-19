import { Link, useLocation } from "react-router-dom";
import { recipeMap } from "../data";
import { clearCooking, useCooking } from "../lib/cooking";

/** «Готовлю сейчас»: вернуться к рецепту, который начат, с любой страницы. */
export function CookingBanner() {
  const cooking = useCooking();
  const location = useLocation();
  const recipe = cooking && recipeMap[cooking.id];
  if (!cooking || !recipe || location.pathname === `/recipe/${recipe.id}`) return null;

  const steps = recipe.steps.length;
  const progress =
    cooking.step > 0
      ? `шаг ${Math.min(cooking.step, steps)} из ${steps}`
      : `продукты ${cooking.checked.length} из ${recipe.ingredients.length}`;

  return (
    <aside className="cooking-now wrap" aria-label="Готовлю сейчас">
      <Link to={`/recipe/${recipe.id}`} state={{ background: location }} className="cooking-now__link">
        <span className="cooking-now__kicker">Готовлю сейчас · {progress}</span>
        <b>{recipe.title}</b>
      </Link>
      <button type="button" className="cooking-now__close" onClick={clearCooking} aria-label={`Закончить готовку «${recipe.title}»`}>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </button>
    </aside>
  );
}
