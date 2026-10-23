import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { recipeMap } from "../data";
import { markFound, newlyCooked, noteHint, noteText, readFound, secretNoteIds } from "../lib/secretNotes";
import { plural } from "../lib/format";
import { useStore } from "../hooks/useStore";
import { Sheet } from "./Sheet";

const dayFmt = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" });

/**
 * Следит за отметками «приготовлено»: если у блюда есть тайная записка и её ещё не нашли — открывает конверт.
 * Отметки, сделанные до открытия сайта, не считаются: записку находят, когда готовят сейчас.
 */
export function SecretNoteWatcher() {
  const { journal } = useStore();
  const before = useRef<Record<string, number> | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const now = Object.fromEntries(secretNoteIds().map((id) => [id, journal[id]?.cooked ?? 0]));
    if (before.current) {
      const id = newlyCooked(before.current, now, secretNoteIds());
      if (id && markFound(id)) {
        setRevealed(false);
        setOpen(id);
      }
    }
    before.current = now;
  }, [journal]);

  const close = useCallback(() => setOpen(null), []);
  if (!open) return null;
  return (
    <Sheet label="Тайная записка" closeLabel="Закрыть записку" onClose={close}>
      <div className="secret">
        <p className="secret__envelope" aria-hidden="true">
          {revealed ? "💌" : "✉️"}
        </p>
        <h2 className="secret__title">Ты нашла тайную записку!</h2>
        {revealed ? (
          <>
            <p className="secret__note">{noteText(open)}</p>
            <button type="button" className="btn btn--accent" onClick={close}>
              🤍
            </button>
          </>
        ) : (
          <button type="button" className="btn btn--accent" onClick={() => setRevealed(true)}>
            Открыть
          </button>
        )}
      </div>
    </Sheet>
  );
}

/** Блок в «Моей кухне»: найденные записки можно перечитать, ненайденные — закрытые конверты с подсказкой. */
export function SecretNotesBlock() {
  const location = useLocation();
  const ids = secretNoteIds();
  const [foundList, setFoundList] = useState(readFound);
  useEffect(() => {
    const refresh = () => setFoundList(readFound());
    window.addEventListener("pp-found-note", refresh);
    return () => window.removeEventListener("pp-found-note", refresh);
  }, []);
  const found = new Map(foundList.map((f) => [f.id, f.date]));
  if (!ids.length) return null;
  const count = ids.filter((id) => found.has(id)).length;
  return (
    <section aria-labelledby="secret-title" className="kitchen__section">
      <h2 id="secret-title" className="menu__title">
        Тайные записки{" "}
        <span className="shopping__left">
          {count} из {ids.length}
        </span>
      </h2>
      <p className="challenge__lead">
        {count < ids.length
          ? `Ещё ${ids.length - count} ${plural(ids.length - count, ["записка спрятана", "записки спрятаны", "записок спрятано"])} в рецептах. Найдёшь, когда приготовишь блюдо.`
          : "Ты нашла все записки! 🤍"}
      </p>
      <ul className="secret__list">
        {ids.map((id) =>
          found.has(id) ? (
            <li key={id} className="secret__item is-found">
              <Link to={`/recipe/${id}`} state={{ background: location }} className="secret__item-title">
                💌 {recipeMap[id].title}
              </Link>
              <p className="secret__item-note">{noteText(id)}</p>
              <p className="secret__item-date">найдена {dayFmt.format(new Date(`${found.get(id)}T12:00:00`))}</p>
            </li>
          ) : (
            <li key={id} className="secret__item">
              <span className="secret__item-title">✉️ {noteHint(id)}</span>
            </li>
          ),
        )}
      </ul>
    </section>
  );
}
