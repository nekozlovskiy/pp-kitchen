import { config } from "../config";
import { togetherLink } from "../lib/together";
import type { Recipe } from "../types";

/** «Готовим вдвоём»: Анюта отмечает его шаги и отправляет ему ссылку с его частью. */
export function TogetherPanel({
  recipe,
  servings,
  partnerSteps,
  onChange,
  onCopied,
}: {
  recipe: Recipe;
  servings: number;
  partnerSteps: ReadonlySet<number>;
  onChange: (steps: number[]) => void;
  onCopied: () => void;
}) {
  const toggle = (i: number) => {
    const next = new Set(partnerSteps);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    onChange([...next].sort((a, b) => a - b));
  };
  const send = async () => {
    // Ссылка внутри текста: отдельное поле url мессенджеры подставляют вместо текста.
    const text = `Готовим вместе «${recipe.title}»! Твои шаги — по ссылке 👨‍🍳\n${togetherLink(recipe.id, servings, [...partnerSteps])}`;
    try {
      if (navigator.share) {
        await navigator.share({ text });
        return;
      }
      await navigator.clipboard.writeText(text);
      onCopied();
    } catch {
      /* пользователь закрыл меню «Поделиться» */
    }
  };
  return (
    <section className="together" aria-labelledby="together-title">
      <h2 id="together-title" className="together__title">
        Готовим вдвоём
      </h2>
      <p className="together__hint">Нажми на шаги, которые делает {config.partnerName.toLowerCase()}, и отправь ему его часть.</p>
      <ol className="together__steps">
        {recipe.steps.map((s, i) => {
          const his = partnerSteps.has(i);
          return (
            <li key={i}>
              <button type="button" className={`together__step ${his ? "is-his" : ""}`} aria-pressed={his} onClick={() => toggle(i)}>
                <span className="together__who">{his ? config.partnerName : "Я"}</span>
                <span className="together__text">
                  {i + 1}. {s}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <button type="button" className="btn btn--accent together__send" disabled={!partnerSteps.size} onClick={send}>
        Отправить его часть
      </button>
    </section>
  );
}
