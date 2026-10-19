import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ingredientMap } from "../data";
import { formatAmount } from "../lib/format";
import { scaleIngredients } from "../lib/nutrition";
import { useWakeLock } from "../hooks/useWakeLock";
import { useStore } from "../hooks/useStore";
import type { Recipe } from "../types";
import { StepText } from "./StepText";

/**
 * Пошаговый режим: один шаг на экран крупным шрифтом, листается свайпом или кнопками.
 * Пока он открыт, экран не гаснет.
 */
export function CookMode({ recipe, servings, onClose }: { recipe: Recipe; servings: number; onClose: () => void }) {
  const { markCooked, showToast } = useStore();
  const [step, setStep] = useState(0); // 0 — продукты, дальше шаги
  const total = recipe.steps.length + 1;
  const { active } = useWakeLock(true);
  const box = useRef<HTMLDivElement>(null);
  const touch = useRef<number | null>(null);

  const go = (d: number) => setStep((s) => Math.max(0, Math.min(total - 1, s + d)));

  useEffect(() => {
    box.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Слушаем в фазе захвата, чтобы Escape закрывал только этот режим, а не весь лист рецепта.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "Tab" && box.current) {
        const items = box.current.querySelectorAll<HTMLElement>("button:not([disabled])");
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) last.focus();
        else if (!e.shiftKey && document.activeElement === last) first.focus();
        else return e.stopImmediatePropagation();
      } else return;
      e.preventDefault();
      e.stopImmediatePropagation();
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = prevOverflow;
    };
    // go и total стабильны на время жизни режима
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose]);

  const finish = () => {
    markCooked(recipe.id);
    showToast("Записала: приготовлено сегодня");
    onClose();
  };

  return createPortal(
    <div
      className="cook"
      role="dialog"
      aria-modal="true"
      aria-label={`Готовим: ${recipe.title}`}
      tabIndex={-1}
      ref={box}
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touch.current == null) return;
        const dx = e.changedTouches[0].clientX - touch.current;
        if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1);
        touch.current = null;
      }}
    >
      <header className="cook__head">
        <p className="cook__title">{recipe.title}</p>
        <button type="button" className="cook__close" onClick={onClose} aria-label="Выйти из пошагового режима">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      <div className="cook__progress" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={i <= step ? "is-on" : ""} />
        ))}
      </div>

      <div className="cook__body" aria-live="polite">
        {step === 0 ? (
          <>
            <p className="cook__kicker">Сначала подготовьте</p>
            <ul className="cook__ingredients">
              {scaleIngredients(recipe, servings).map((it) => (
                <li key={it.id}>
                  <span>{ingredientMap[it.id]?.name ?? it.id}</span>
                  <b>{formatAmount(ingredientMap[it.id], it.grams)}</b>
                </li>
              ))}
              {recipe.extras?.map((e) => (
                <li key={e.name}>
                  <span>{e.name}</span>
                  <b>{e.amount}</b>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <p className="cook__kicker">
              Шаг {step} из {total - 1}
            </p>
            <p className="cook__step">
              <StepText text={recipe.steps[step - 1]} recipeTitle={recipe.title} />
            </p>
          </>
        )}
      </div>

      <footer className="cook__foot">
        <p className="cook__lock">{active ? "Экран не погаснет" : " "}</p>
        <div className="cook__nav">
          <button type="button" className="btn btn--ghost" onClick={() => go(-1)} disabled={step === 0}>
            Назад
          </button>
          {step < total - 1 ? (
            <button type="button" className="btn btn--accent" onClick={() => go(1)}>
              {step === 0 ? "Начать" : "Дальше"}
            </button>
          ) : (
            <button type="button" className="btn btn--accent" onClick={finish}>
              Готово!
            </button>
          )}
        </div>
      </footer>
    </div>,
    document.body,
  );
}
