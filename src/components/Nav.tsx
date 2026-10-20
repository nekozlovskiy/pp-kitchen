import { NavLink } from "react-router-dom";
import { useStore } from "../hooks/useStore";

function Icon({ name }: { name: "book" | "heart" | "sun" | "bag" | "week" }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  if (name === "book")
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path {...p} d="M4 5.5C4 4.7 4.7 4 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5Z M20 5.5c0-.8-.7-1.5-1.5-1.5H13v16h5.5c.8 0 1.5-.7 1.5-1.5Z" />
      </svg>
    );
  if (name === "bag")
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path {...p} d="M5 8h14l-1.2 11.2A2 2 0 0 1 15.8 21H8.2a2 2 0 0 1-2-1.8Z M9 8V6.5a3 3 0 0 1 6 0V8" />
      </svg>
    );
  if (name === "week")
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path {...p} d="M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z M4 10h16 M8 3.5V7 M16 3.5V7 M8 14h2 M14 14h2 M8 17h2" />
      </svg>
    );
  if (name === "heart")
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path {...p} d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <circle {...p} cx="12" cy="12" r="4" />
      <path {...p} d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
    </svg>
  );
}

export function Nav() {
  const { favorites, day, foods, shopping, week } = useStore();
  const plannedDays = week.filter((d) => d.length).length;
  // Число блюд за день: порции бывают дробными, когда вес вводится в граммах.
  const portions = day.length + foods.length;
  return (
    <nav className="nav" aria-label="Разделы">
      <NavLink to="/" end className="nav__link">
        <Icon name="book" />
        <span>Рецепты</span>
      </NavLink>
      <NavLink to="/favorites" className="nav__link">
        <Icon name="heart" />
        <span>Избранное</span>
        {favorites.size > 0 && <b className="nav__badge">{favorites.size}</b>}
      </NavLink>
      <NavLink to="/day" className="nav__link">
        <Icon name="sun" />
        <span>Мой день</span>
        {portions > 0 && <b className="nav__badge">{portions}</b>}
      </NavLink>
      <NavLink to="/week" className="nav__link">
        <Icon name="week" />
        <span>Неделя</span>
        {plannedDays > 0 && <b className="nav__badge">{plannedDays}</b>}
      </NavLink>
      <NavLink to="/shopping" className="nav__link">
        <Icon name="bag" />
        <span>Покупки</span>
        {shopping.items.length > 0 && <b className="nav__badge">{shopping.items.length}</b>}
      </NavLink>
    </nav>
  );
}
