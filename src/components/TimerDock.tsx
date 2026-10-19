import { formatClock } from "../lib/steptime";
import { useTimers } from "../hooks/useTimers";
import { ClockIcon } from "./StepText";

/** Запущенные таймеры: видны поверх любой страницы, пока их не закроют. */
export function TimerDock() {
  const { timers, now, remove } = useTimers();
  if (!timers.length) return null;
  return (
    <aside className="timers" aria-label="Таймеры">
      <ul>
        {timers.map((t) => {
          const left = (t.endsAt - now) / 1000;
          return (
            <li key={t.id} className={`timer ${t.done ? "is-done" : ""}`}>
              <ClockIcon />
              <span className="timer__text">
                <b className="timer__clock" aria-live={t.done ? "assertive" : "off"}>
                  {t.done ? "Готово!" : formatClock(left)}
                </b>
                <span className="timer__label">
                  {t.recipeTitle}: {t.label}
                </span>
              </span>
              <button type="button" className="timer__close" onClick={() => remove(t.id)} aria-label={t.done ? "Закрыть таймер" : "Остановить таймер"}>
                {t.done ? "Ок" : "×"}
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
