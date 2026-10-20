import { Link, useLocation } from "react-router-dom";
import { ingredientMap, recipeMap } from "../data";
import { formatAmount, plural } from "../lib/format";
import { buildShoppingList } from "../lib/shopping";
import { groupByAisle } from "../lib/aisles";
import { Stepper } from "../components/Stepper";
import { useStore } from "../hooks/useStore";

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Запасной путь для старых браузеров и небезопасного контекста
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}

export function Shopping() {
  const { shopping, setShoppingServings, removeFromShopping, toggleBought, clearShopping, showToast, swaps } = useStore();
  const location = useLocation();
  const { lines, extras } = buildShoppingList(shopping.items, swaps);
  const bought = new Set(shopping.checked);
  const left = lines.filter((l) => !bought.has(l.id)).length;

  // На телефоне — системное меню «Поделиться» (Заметки, мессенджеры), на компьютере — копирование.
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const send = async () => {
    const text = [
      "Список покупок",
      ...groupByAisle(lines.filter((l) => !bought.has(l.id))).flatMap((g) => [
        "",
        `${g.aisle}:`,
        ...g.lines.map((l) => `— ${l.name}: ${formatAmount(ingredientMap[l.id], l.grams)}`),
      ]),
      ...(extras.length ? ["", "Ещё понадобится: " + extras.join(", ")] : []),
    ].join("\n");
    if (canShare) {
      try {
        await navigator.share({ title: "Список покупок", text });
        return;
      } catch (e) {
        // Закрыли меню — ничего не делаем; иначе (браузер отказал) пробуем скопировать
        if ((e as DOMException)?.name === "AbortError") return;
      }
    }
    showToast((await copyText(text)) ? "Список скопирован" : "Не удалось скопировать: выделите список вручную");
  };

  return (
    <main className="wrap shopping">
      <header className="page-head">
        <h1 className="page-title">Покупки</h1>
        <p className="page-sub">
          {shopping.items.length
            ? `Продукты для ${shopping.items.length} ${plural(shopping.items.length, ["рецепта", "рецептов", "рецептов"])}, одинаковые сложены вместе.`
            : "Соберите продукты сразу для нескольких блюд."}
        </p>
      </header>

      {shopping.items.length ? (
        <div className="shopping__layout">
          <section aria-label="Рецепты в списке">
            <h2 className="shopping__h">Рецепты</h2>
            <ul className="day__list">
              {shopping.items.map((x, i) => {
                const r = recipeMap[x.id];
                return (
                  <li key={x.id} className="day__item">
                    <Link to={`/recipe/${x.id}`} state={{ background: location }} className="day__item-title">
                      {r.title}
                    </Link>
                    <div className="day__item-ctrl">
                      <Stepper
                        value={x.servings}
                        onChange={(v) => setShoppingServings(i, v)}
                        min={1}
                        max={20}
                        label={`Порции: ${r.title}`}
                        format={(v) => `${v} ${plural(v, ["порция", "порции", "порций"])}`}
                      />
                      <button type="button" className="btn btn--text" onClick={() => removeFromShopping(i)} aria-label={`Убрать «${r.title}»`}>
                        Убрать
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <section aria-label="Что купить" className="shopping__list">
            <div className="recipe__section-head">
              <h2 className="shopping__h">
                Купить <span className="shopping__left">{left ? `осталось ${left}` : "всё куплено"}</span>
              </h2>
              <button type="button" className="btn btn--accent" onClick={send}>
                {canShare ? "Отправить" : "Скопировать"}
              </button>
            </div>
            {groupByAisle(lines).map((g) => (
              <div key={g.aisle} className="shopping__aisle">
                <h3 className="shopping__aisle-title">{g.aisle}</h3>
                <ul className="ingredients">
                  {g.lines.map((l) => (
                    <li key={l.id}>
                      <label className={bought.has(l.id) ? "is-done" : ""}>
                        <input type="checkbox" checked={bought.has(l.id)} onChange={() => toggleBought(l.id)} />
                        <span className="ingredients__name">{l.name}</span>
                        <span className="ingredients__amount">{formatAmount(ingredientMap[l.id], l.grams)}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {extras.length > 0 && (
              <p className="shopping__extras">
                <b>Ещё понадобится:</b> {extras.join(", ")}
              </p>
            )}
            <button type="button" className="btn btn--ghost" onClick={clearShopping}>
              Очистить список
            </button>
          </section>
        </div>
      ) : (
        <div className="empty">
          <p className="empty__title">Список пуст</p>
          <p>Откройте рецепт, выберите число порций и нажмите «В покупки». Продукты из разных блюд сложатся в один список.</p>
          <Link to="/" className="btn btn--accent">
            Выбрать рецепты
          </Link>
        </div>
      )}
    </main>
  );
}
