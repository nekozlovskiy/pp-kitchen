import { Link, useLocation } from "react-router-dom";
import { recipeMap, servingMacros } from "../data";
import { plural } from "../lib/format";
import { cookEvents, kitchenStats } from "../lib/kitchen";
import type { CookEvent } from "../lib/kitchen";
import { Art } from "../art/Art";
import { useStore } from "../hooks/useStore";
import { usePhotoUrl } from "../hooks/usePhoto";
import { ChallengeBlock } from "../components/Challenge";
import { SecretNotesBlock } from "../components/SecretNotes";

const dayFmt = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" });
const monthFmt = new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" });
const asDate = (key: string) => new Date(`${key}T12:00:00`);

function FeedItem({ event }: { event: CookEvent }) {
  const { journal } = useStore();
  const location = useLocation();
  const r = recipeMap[event.id];
  const entry = journal[event.id];
  const photo = usePhotoUrl(r.id, entry?.photo);
  return (
    <li>
      <Link to={`/recipe/${r.id}`} state={{ background: location }} className="feed__item">
        {photo ? <img className="feed__art" src={photo} alt="" loading="lazy" /> : <Art className="feed__art" kind={r.art} category={r.category} seed={r.id} />}
        <span className="feed__title">{r.title}</span>
        <span className="feed__meta">
          {dayFmt.format(asDate(event.date))} · {Math.round(servingMacros[r.id].kcal)} ккал
          {entry?.rating ? <span aria-label={`оценка ${entry.rating} из 5`}> · ★ {entry.rating}</span> : null}
        </span>
      </Link>
    </li>
  );
}

/** «Моя кухня»: что и когда готовила, цифры и шуточные достижения. Всё из личных отметок на этом телефоне. */
export function Kitchen() {
  const { journal } = useStore();
  const stats = kitchenStats(journal);
  const events = cookEvents(journal);
  const months: { key: string; events: CookEvent[] }[] = [];
  for (const e of events) {
    const key = e.date.slice(0, 7);
    if (months.at(-1)?.key !== key) months.push({ key, events: [] });
    months.at(-1)!.events.push(e);
  }
  const earned = stats.achievements.filter((a) => a.done).length;

  return (
    <main className="wrap kitchen">
      <header className="page-head">
        <h1 className="page-title">Моя кухня</h1>
        <p className="page-sub">
          Что и когда готовила. Отмечайте блюда кнопкой «Приготовила сегодня» в рецепте — лента и достижения соберутся сами.
        </p>
      </header>

      <section aria-label="Цифры" className="kitchen__stats">
        <div className="kitchen__stat">
          <b>{stats.total}</b>
          <span>{plural(stats.total, ["раз готовила", "раза готовила", "раз готовила"])}</span>
        </div>
        <div className="kitchen__stat">
          <b>{stats.distinct}</b>
          <span>{plural(stats.distinct, ["разное блюдо", "разных блюда", "разных блюд"])}</span>
        </div>
        <div className="kitchen__stat">
          <b>{stats.thisMonth}</b>
          <span>в этом месяце</span>
        </div>
        <div className="kitchen__stat">
          <b className="kitchen__stat-word">{stats.topCategory ?? "—"}</b>
          <span>любимый раздел</span>
        </div>
      </section>

      <ChallengeBlock />

      <SecretNotesBlock />

      <section aria-labelledby="ach-title" className="kitchen__section">
        <h2 id="ach-title" className="menu__title">
          Достижения <span className="shopping__left">{earned} из {stats.achievements.length}</span>
        </h2>
        <ul className="ach">
          {stats.achievements.map((a) => (
            <li key={a.id} className={`ach__item ${a.done ? "is-done" : ""}`}>
              <span className="ach__badge" aria-hidden="true">
                {a.done ? "★" : "☆"}
              </span>
              <span className="ach__title">{a.title}</span>
              <span className="ach__hint">{a.hint}</span>
              <span className="ach__bar" role="progressbar" aria-valuemin={0} aria-valuemax={a.target} aria-valuenow={a.value} aria-label={`${a.title}: ${a.value} из ${a.target}`}>
                <span style={{ width: `${(a.value / a.target) * 100}%` }} />
              </span>
              <span className="ach__count">
                {a.value} из {a.target}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="feed-title" className="kitchen__section">
        <h2 id="feed-title" className="menu__title">
          Что я готовила
        </h2>
        {months.length ? (
          months.map((m) => (
            <div key={m.key} className="feed__month">
              <h3 className="shopping__aisle-title">{monthFmt.format(asDate(`${m.key}-01`))}</h3>
              <ul className="feed">
                {m.events.map((e, i) => (
                  <FeedItem key={`${e.id}-${e.date}-${i}`} event={e} />
                ))}
              </ul>
            </div>
          ))
        ) : (
          <div className="empty">
            <p className="empty__title">Пока пусто</p>
            <p>Откройте рецепт, который готовили, и нажмите «Приготовила сегодня».</p>
            <Link to="/" className="btn btn--accent">
              К рецептам
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
