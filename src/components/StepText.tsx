import { Fragment } from "react";
import { splitStep } from "../lib/steptime";
import { useTimers } from "../hooks/useTimers";
import { useStore } from "../hooks/useStore";

export function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <circle cx="12" cy="13" r="7.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M12 9.5V13l2.5 1.8M9.5 3h5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Текст шага, в котором упоминания времени — кнопки, запускающие таймер. */
export function StepText({ text, recipeTitle }: { text: string; recipeTitle: string }) {
  const { start } = useTimers();
  const { showToast } = useStore();
  const label = text.length > 56 ? `${text.slice(0, 54).trimEnd()}…` : text;
  return (
    <>
      {splitStep(text).map((part, i) =>
        part.seconds ? (
          <button
            key={i}
            type="button"
            className="timer-chip"
            aria-label={`Запустить таймер: ${part.text}`}
            onClick={() => {
              start(label, part.seconds!, recipeTitle);
              showToast(`Таймер запущен: ${part.text}`);
            }}
          >
            <ClockIcon />
            {part.text}
          </button>
        ) : (
          <Fragment key={i}>{part.text}</Fragment>
        ),
      )}
    </>
  );
}
