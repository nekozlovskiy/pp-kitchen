import { useState } from "react";
import { Link } from "react-router-dom";
import { ingredientMap, recipes } from "../data";
import { useStore } from "../hooks/useStore";
import { dinnerHints, dinnerPool, pickDinner } from "../lib/surprise";
import { RecipeCard } from "../components/RecipeCard";

const dinnerIngredients = Object.values(ingredientMap).filter((i) => recipes.some((r) => r.category === "dinner" && r.ingredients.some((p) => p.id === i.id)))
  .sort((a, b) => a.name.localeCompare(b.name, "ru"));

export function Surprise() {
  const { exclude, dislikes } = useStore();
  const [time, setTime] = useState(60);
  const [products, setProducts] = useState<string[]>([]);
  const [selection, setSelection] = useState<{ id: string; filterKey: string } | null>(null);
  const [revealed, setRevealed] = useState(false);
  const filterKey = JSON.stringify([time, products, exclude, dislikes]);
  const pool = dinnerPool(recipes, exclude, dislikes, time, products);
  const selected = selection?.filterKey === filterKey ? pool.find((r) => r.id === selection.id) : undefined;
  const pick = () => {
    const r = pickDinner(pool, selected?.id ?? null);
    setSelection(r ? { id: r.id, filterKey } : null);
    setRevealed(false);
  };
  const reset = () => { setSelection(null); setRevealed(false); };
  return <main className="wrap keepsakes-page surprise-page">
    <header className="page-head"><Link to="/" className="btn btn--text">← К рецептам</Link>
      <p className="keepsake-kicker">Немного интриги к вечеру</p><h1 className="page-title">Ужин-сюрприз</h1>
      <p className="page-sub">Сначала подсказки. Потом — маленькое вкусное открытие.</p>
    </header>
    <section className="keepsake-panel" aria-label="Пожелания к ужину">
      <label className="keepsake-field">Сколько есть времени
        <select value={time} onChange={(e) => { setTime(Number(e.target.value)); reset(); }}>
          {[20, 30, 45, 60, 90].map((n) => <option key={n} value={n}>До {n} минут</option>)}<option value={1440}>Время не ограничено</option>
        </select>
      </label>
      <p className="journal__hint">Время — по рецепту. Маринование и другое ожидание, если указаны отдельно, будут в подсказках.</p>
      <label className="keepsake-field">Что хочется использовать (необязательно)
        <select value="" onChange={(e) => { if (e.target.value) { setProducts([...products, e.target.value]); reset(); } }}>
          <option value="">Добавить продукт…</option>
          {dinnerIngredients.filter((i) => !products.includes(i.id) && !dislikes.includes(i.id)).map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
      </label>
      <div className="toggles">{products.map((id) => <button key={id} type="button" className="toggle is-on" aria-label={`Убрать ${ingredientMap[id].name}`} onClick={() => { setProducts(products.filter((p) => p !== id)); reset(); }}>{ingredientMap[id].name} ×</button>)}</div>
      <p className="journal__hint">В блюде будут все выбранные продукты. Ваши ограничения и нелюбимые продукты учитываются автоматически.</p>
      <button type="button" className="btn btn--accent" onClick={pick} disabled={!pool.length}>Подобрать сюрприз</button>
    </section>
    {!pool.length && <div className="empty" role="status"><p className="empty__title">Такой ужин пока не нашёлся</p><p>Увеличьте время или уберите один из продуктов. Ограничения по еде сохранятся.</p></div>}
    <div aria-live="polite" aria-atomic="true">
      {selected && !revealed && <section className="surprise-envelope">
        <span className="surprise-envelope__seal" aria-hidden="true">?</span>
        <p className="keepsake-kicker">Ваш ужин пока в секрете</p><h2>Уже есть идея…</h2>
        <ul>{dinnerHints(selected).map((hint) => <li key={hint}>{hint}</li>)}</ul>
        <div className="keepsake-actions"><button type="button" className="btn btn--accent" onClick={() => setRevealed(true)}>Раскрыть рецепт</button>
          {pool.length > 1 && <button type="button" className="btn btn--ghost" onClick={pick}>Другой сюрприз</button>}</div>
      </section>}
      {selected && revealed && <section className="surprise-reveal"><h2>Сегодня на ужин…</h2><RecipeCard recipe={selected} />
        {pool.length > 1 ? <button type="button" className="btn btn--ghost" onClick={pick}>Другой сюрприз</button> : <p className="journal__hint">С такими пожеланиями подошёл один рецепт.</p>}</section>}
    </div>
  </main>;
}
