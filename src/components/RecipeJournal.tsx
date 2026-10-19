import { useEffect, useRef, useState } from "react";
import { useStore } from "../hooks/useStore";
import { usePhotoUrl } from "../hooks/usePhoto";
import { deletePhoto, savePhoto } from "../lib/photos";
import { plural } from "../lib/format";
import type { Recipe } from "../types";

const dateFmt = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" });

/** Личные отметки к рецепту: оценка, сколько раз готовила, заметки и своё фото. */
export function RecipeJournal({ recipe }: { recipe: Recipe }) {
  const { journal, updateJournal, markCooked, showToast } = useStore();
  const entry = journal[recipe.id] ?? {};
  const [note, setNote] = useState(entry.note ?? "");
  const photo = usePhotoUrl(recipe.id, entry.photo);
  const file = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  // Заметка сохраняется сама через полсекунды после последнего нажатия.
  useEffect(() => {
    if (note === (entry.note ?? "")) return;
    const t = window.setTimeout(() => updateJournal(recipe.id, { note: note.trim() ? note : undefined }), 500);
    return () => window.clearTimeout(t);
  }, [note, entry.note, recipe.id, updateJournal]);

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true);
    const ok = await savePhoto(recipe.id, f);
    setBusy(false);
    if (ok) {
      updateJournal(recipe.id, { photo: Date.now() });
      showToast("Фото сохранено");
    } else showToast("Не получилось сохранить фото");
  };

  const cooked = entry.cooked ?? 0;

  return (
    <section className="recipe__section journal" aria-labelledby={`journal-${recipe.id}`}>
      <h2 id={`journal-${recipe.id}`}>Мои отметки</h2>

      <div className="journal__row">
        <div className="stars" role="radiogroup" aria-label="Моя оценка">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={entry.rating === n}
              aria-label={`${n} из 5`}
              className={`star ${(entry.rating ?? 0) >= n ? "is-on" : ""}`}
              onClick={() => updateJournal(recipe.id, { rating: entry.rating === n ? undefined : n })}
            >
              <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
                <path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9Z" />
              </svg>
            </button>
          ))}
        </div>
        <button type="button" className="btn btn--ghost journal__cooked" onClick={() => markCooked(recipe.id)}>
          Приготовила сегодня
        </button>
      </div>
      {cooked > 0 && (
        <p className="journal__meta">
          Готовила {cooked} {plural(cooked, ["раз", "раза", "раз"])}
          {entry.last ? `, последний раз ${dateFmt.format(new Date(`${entry.last}T12:00:00`))}` : ""}
        </p>
      )}

      <label className="journal__note">
        <span>Заметки</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Например: соли меньше, в следующий раз двойную порцию"
        />
      </label>

      <div className="journal__photo">
        {photo && <img src={photo} alt={`Моё фото: ${recipe.title}`} />}
        <div className="journal__photo-actions">
          <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => file.current?.click()}>
            {busy ? "Сохраняю…" : entry.photo ? "Заменить фото" : "Добавить своё фото"}
          </button>
          {entry.photo ? (
            <button
              type="button"
              className="btn btn--text"
              onClick={async () => {
                await deletePhoto(recipe.id);
                updateJournal(recipe.id, { photo: undefined });
              }}
            >
              Удалить фото
            </button>
          ) : null}
        </div>
        <input
          ref={file}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            onFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      <p className="journal__hint">Отметки и фото хранятся только на этом телефоне.</p>
    </section>
  );
}
