import { useEffect } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import type { Location } from "react-router-dom";
import { config } from "./config";
import { recipeMap } from "./data";
import { Nav } from "./components/Nav";
import { Toast } from "./components/Toast";
import { Home } from "./pages/Home";
import { RecipeSheet } from "./pages/Recipe";
import { Day } from "./pages/Day";
import { Favorites } from "./pages/Favorites";
import { NotFound } from "./pages/NotFound";
import { Shopping } from "./pages/Shopping";
import { Pantry } from "./pages/Pantry";
import { Week } from "./pages/Week";
import { Transfer } from "./pages/Transfer";
import { Kitchen } from "./pages/Kitchen";
import { Swipe } from "./pages/Swipe";
import { MyRecipeEditor, MyRecipes } from "./pages/MyRecipes";
import { TimerDock } from "./components/TimerDock";
import { CookingBanner } from "./components/CookingBanner";
import { AchievementWatcher } from "./components/AchievementWatcher";

function useTitle(location: Location) {
  useEffect(() => {
    const m = location.pathname.match(/^\/recipe\/(.+)$/);
    const r = m ? recipeMap[decodeURIComponent(m[1])] : undefined;
    const page =
      r?.title ??
      (location.pathname.startsWith("/my/") && location.pathname !== "/my/new" ? "Изменить рецепт" : undefined) ??
      ({ "/day": "Мой день", "/favorites": "Избранное", "/shopping": "Покупки", "/pantry": "Из того, что есть", "/week": "Меню на неделю", "/transfer": "Перенос", "/kitchen": "Моя кухня", "/my": "Мои рецепты", "/my/new": "Новый рецепт" } as Record<string, string>)[
        location.pathname
      ];
    document.title = page ? `${page} | ПП-кухня` : `ПП-кухня ${config.herNameGenitive}`;
  }, [location.pathname]);
}

export function App() {
  const location = useLocation();
  const background = (location.state as { background?: Location } | null)?.background;
  useTitle(location);

  useEffect(() => {
    if (!background) window.scrollTo(0, 0);
  }, [location.pathname, background]);

  return (
    <>
      <a className="skip" href="#content">
        К содержимому
      </a>
      <div className="topbar wrap">
        <Link to="/" className="topbar__brand" aria-label="ПП-кухня, на главную">
          ПП‑кухня
        </Link>
        <Nav />
      </div>
      <CookingBanner />
      <div id="content">
        <Routes location={background ?? location}>
          <Route path="/" element={<Home />} />
          <Route
            path="/recipe/:id"
            element={
              <>
                <Home />
                <RecipeSheet />
              </>
            }
          />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/day" element={<Day />} />
          <Route path="/shopping" element={<Shopping />} />
          <Route path="/pantry" element={<Pantry />} />
          <Route path="/week" element={<Week />} />
          <Route path="/transfer" element={<Transfer />} />
          <Route path="/kitchen" element={<Kitchen />} />
          <Route path="/swipe" element={<Swipe />} />
          <Route path="/my" element={<MyRecipes />} />
          <Route path="/my/new" element={<MyRecipeEditor />} />
          <Route path="/my/:id" element={<MyRecipeEditor key={location.pathname} />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        {background && (
          <Routes>
            <Route path="/recipe/:id" element={<RecipeSheet />} />
          </Routes>
        )}
      </div>
      <footer className="footer wrap">
        <p className="footer__love">Сделано с любовью для {config.herNameGenitive}</p>
        <p className="disclaimer">{config.disclaimer}</p>
        <p className="footer__links">
          <Link to="/kitchen">Моя кухня: что я готовила и достижения</Link>
          {" · "}
          <Link to="/transfer">Перенести избранное и отметки на другой телефон</Link>
        </p>
      </footer>
      <TimerDock />
      <AchievementWatcher />
      <Toast />
    </>
  );
}
