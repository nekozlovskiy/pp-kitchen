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
import { TimerDock } from "./components/TimerDock";

function useTitle(location: Location) {
  useEffect(() => {
    const m = location.pathname.match(/^\/recipe\/(.+)$/);
    const r = m ? recipeMap[decodeURIComponent(m[1])] : undefined;
    const page =
      r?.title ??
      ({ "/day": "Мой день", "/favorites": "Избранное", "/shopping": "Покупки", "/pantry": "Из того, что есть", "/week": "Меню на неделю" } as Record<string, string>)[
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
      </footer>
      <TimerDock />
      <Toast />
    </>
  );
}
