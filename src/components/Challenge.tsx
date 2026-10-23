import { useState } from "react";
import { Link } from "react-router-dom";
import { config } from "../config";
import { plural, todayKey } from "../lib/format";
import { addDone, challengeMap, challengeProgress, challenges, daysLeft, readActive, readDone, saveActive, type Active } from "../lib/challenges";
import { useStore } from "../hooks/useStore";

const DEFAULT_NOTE = "Ты справилась! Горжусь тобой и жду, что приготовим дальше. Люблю 🤍";

/** «Челлендж месяца» в «Моей кухне»: выбор задания, прогресс и открытка в конце. */
export function ChallengeBlock() {
  const { journal } = useStore();
  const [active, setActive] = useState<Active | null>(readActive);
  const [done, setDone] = useState(readDone);

  const start = (id: string) => {
    const a = { id, start: todayKey() };
    saveActive(a);
    setActive(a);
  };
  const stop = () => {
    saveActive(null);
    setActive(null);
  };

  const doneCount = (id: string) => done.filter((d) => d.id === id).length;
  const list = (
    <ul className="challenge__list">
      {challenges.map((c) => (
        <li key={c.id}>
          <button type="button" className="challenge__pick" onClick={() => start(c.id)}>
            <span className="challenge__emoji" aria-hidden="true">
              {c.emoji}
            </span>
            <span>
              <b>{c.title}</b>
              <span className="challenge__hint">{c.hint}</span>
            </span>
            {doneCount(c.id) > 0 && <span className="challenge__done-badge">✓ {doneCount(c.id) > 1 ? `×${doneCount(c.id)}` : ""}</span>}
          </button>
        </li>
      ))}
    </ul>
  );

  let body;
  if (!active) {
    body = (
      <>
        <p className="challenge__lead">Выбери задание на 30 дней. Засчитывается всё, что отмечено «Приготовила сегодня».</p>
        {list}
      </>
    );
  } else {
    const c = challengeMap[active.id];
    const p = challengeProgress(journal, active.id, active.start);
    const left = daysLeft(active.start);
    if (p.done) {
      body = (
        <div className="challenge__card challenge__card--postcard">
          <p className="challenge__kicker">Задание выполнено 🎉</p>
          <p className="challenge__title">
            {c.emoji} {c.title}
          </p>
          <p className="challenge__note">{config.challengeNotes[c.id] ?? DEFAULT_NOTE}</p>
          <button
            type="button"
            className="btn btn--accent"
            onClick={() => {
              addDone(c.id);
              setDone(readDone());
              stop();
            }}
          >
            Спасибо! 🤍
          </button>
        </div>
      );
    } else if (left <= 0) {
      body = (
        <div className="challenge__card">
          <p className="challenge__title">
            {c.emoji} {c.title}: {p.value} из {p.target}
          </p>
          <p className="challenge__lead">Месяц прошёл — ничего страшного, это же игра. Можно попробовать ещё раз или взять другое.</p>
          <div className="challenge__actions">
            <button type="button" className="btn btn--accent" onClick={() => start(c.id)}>
              Ещё раз
            </button>
            <button type="button" className="btn btn--ghost" onClick={stop}>
              Выбрать другое
            </button>
          </div>
        </div>
      );
    } else {
      body = (
        <div className="challenge__card">
          <p className="challenge__title">
            {c.emoji} {c.title}
          </p>
          <p className="challenge__hint">{c.hint}</p>
          <span className="ach__bar challenge__bar" role="progressbar" aria-valuemin={0} aria-valuemax={p.target} aria-valuenow={p.value} aria-label={`${c.title}: ${p.value} из ${p.target}`}>
            <span style={{ width: `${(p.value / p.target) * 100}%` }} />
          </span>
          <p className="challenge__count">
            {p.value} из {p.target} · {plural(left, ["остался", "осталось", "осталось"])} {left} {plural(left, ["день", "дня", "дней"])}
          </p>
          <button type="button" className="btn btn--text" onClick={stop}>
            Сменить задание
          </button>
        </div>
      );
    }
  }

  return (
    <section aria-labelledby="challenge-title" className="kitchen__section challenge">
      <h2 id="challenge-title" className="menu__title">
        Челлендж месяца
      </h2>
      {body}
    </section>
  );
}

/** Полоска на главной: как идёт задание или что открытка уже ждёт. */
export function ChallengeStrip() {
  const { journal } = useStore();
  const active = readActive();
  if (!active) return null;
  const c = challengeMap[active.id];
  const p = challengeProgress(journal, active.id, active.start);
  if (!p.done && daysLeft(active.start) <= 0) return null;
  return (
    <Link to="/kitchen" className="challenge-strip">
      <span aria-hidden="true">{c.emoji}</span>
      <span>{p.done ? `${c.title}: выполнено — тебя ждёт открытка 💌` : `${c.title}: ${p.value} из ${p.target}`}</span>
      <span aria-hidden="true">→</span>
    </Link>
  );
}
