import { Link } from "react-router-dom";
import { recipes } from "../data";
import { useStore } from "../hooks/useStore";
import { passportStamps } from "../lib/passport";

export function Passport() {
  const { journal, myRecipes } = useStore();
  const stamps = passportStamps(journal, [...recipes, ...myRecipes]);
  const earned = stamps.filter((s) => s.done).length;
  return <main className="wrap keepsakes-page">
    <header className="page-head">
      <Link to="/kitchen" className="btn btn--text">← Моя кухня</Link>
      <p className="keepsake-kicker">Маленькие открытия, большие воспоминания</p>
      <h1 className="page-title">Кулинарный паспорт</h1>
      <p className="page-sub">Каждое новое блюдо — ещё одно место в вашем путешествии по вкусам.</p>
    </header>
    <div className="passport-cover"><span aria-hidden="true">✦</span><p>Паспорт вкусных открытий</p><b>Анюта и Даня</b><p>{earned} из {stamps.length} штампов</p></div>
    <p className="journal__hint">Штампы появляются после отметки «Приготовила сегодня». Прежние приготовления уже учтены.</p>
    <ul className="passport-grid" aria-label="Штампы открытий">
      {stamps.map((s, i) => <li key={s.id} className={`passport-stamp ${s.done ? "is-earned" : ""}`}>
        <span className="passport-stamp__number">Открытие № {String(i + 1).padStart(2, "0")}</span>
        <span className="passport-stamp__symbol" aria-hidden="true">{s.symbol}</span>
        <h2>{s.title}</h2><p>{s.hint}</p>
        <span className="passport-stamp__status">{s.done ? "Штамп получен ✓" : `${s.value} из ${s.target}`}</span>
        <progress max={s.target} value={s.value} aria-label={s.title} />
      </li>)}
    </ul>
    <Link to="/" className="btn btn--accent">За новым открытием</Link>
  </main>;
}
