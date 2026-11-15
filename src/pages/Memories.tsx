import { useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { recipeMap, recipes } from "../data";
import { Art } from "../art/Art";
import { useStore } from "../hooks/useStore";
import { usePhotoUrl } from "../hooks/usePhoto";
import { memoryPhotoKey, validMemoryDate, type Memory } from "../lib/keepsakes";
import { deletePhoto, savePhoto } from "../lib/photos";
import { todayKey } from "../lib/format";

function MemoryCard({ memory, onEdit, editable }: { memory: Memory; onEdit: () => void; editable: boolean }) {
  const { removeMemory, showToast } = useStore();
  const photo = usePhotoUrl(memoryPhotoKey(memory.id), memory.photo);
  const recipe = Object.hasOwn(recipeMap, memory.recipeId) ? recipeMap[memory.recipeId] : undefined;
  return <article className="memory-card">
    {photo ? <img className="memory-card__photo" src={photo} alt={memory.caption || `Воспоминание: ${recipe?.title ?? "наш ужин"}`} /> :
      <div className="memory-card__art">{recipe ? <Art kind={recipe.art} category={recipe.category} seed={memory.id} /> : <span aria-hidden="true">♡</span>}</div>}
    <div className="memory-card__body"><time dateTime={memory.date}>{new Date(`${memory.date}T12:00:00`).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}</time>
      <h2>{recipe ? <Link to={`/recipe/${recipe.id}`}>{recipe.title}</Link> : "Рецепт больше не сохранён"}</h2>
      {memory.caption && <p className="memory-card__caption">{memory.caption}</p>}
      {editable && <div className="keepsake-actions"><button type="button" className="btn btn--text" onClick={onEdit}>Изменить</button>
        <button type="button" className="btn btn--text" onClick={async () => {
          if (!window.confirm("Удалить это воспоминание и его фото?")) return;
          removeMemory(memory.id);
          const deleted = await deletePhoto(memoryPhotoKey(memory.id));
          showToast(deleted ? "Воспоминание удалено" : "Запись удалена. Фото не удалось удалить из хранилища.");
        }}>Удалить</button></div>}
    </div>
  </article>;
}

function MemoryForm({ initial, initialRecipe, onClose }: { initial?: Memory; initialRecipe: string; onClose: () => void }) {
  const { myRecipes, saveMemory, showToast } = useStore();
  const [recipeId, setRecipeId] = useState(initial?.recipeId ?? initialRecipe);
  const [date, setDate] = useState(initial?.date ?? todayKey());
  const [caption, setCaption] = useState(initial?.caption ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const id = useRef(initial?.id ?? crypto.randomUUID());
  const photo = usePhotoUrl(memoryPhotoKey(id.current), initial?.photo);
  const list = [...recipes, ...myRecipes];
  return <form className="keepsake-panel memory-form" onSubmit={async (e) => {
    e.preventDefault();
    if (busy) return;
    if (!recipeId || !validMemoryDate(date)) { setError("Выберите рецепт и корректную дату."); return; }
    setBusy(true); setError("");
    let version = initial?.photo;
    if (file) {
      if (!await savePhoto(memoryPhotoKey(id.current), file)) {
        setError("Не получилось сохранить фото. Попробуйте другой снимок или сохраните запись без него."); setBusy(false); return;
      }
      version = Date.now();
    } else if (removePhoto) {
      if (!await deletePhoto(memoryPhotoKey(id.current))) { setError("Не получилось удалить фото. Попробуйте ещё раз."); setBusy(false); return; }
      version = undefined;
    }
    saveMemory({ id: id.current, recipeId, date, caption: caption.trim(), ...(version ? { photo: version } : {}) });
    showToast("Воспоминание сохранено"); onClose();
  }}>
    <h2>{initial ? "Изменить воспоминание" : "Сохранить момент"}</h2>
    <fieldset disabled={busy}>
      <label className="keepsake-field">Блюдо<select value={recipeId} required onChange={(e) => setRecipeId(e.target.value)}>
        <option value="">Выбрать рецепт…</option>
        {initial && !Object.hasOwn(recipeMap, initial.recipeId) && <option value={initial.recipeId}>Ранее удалённый рецепт</option>}
        {list.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
      </select></label>
      <label className="keepsake-field">Дата<input type="date" value={date} required onChange={(e) => setDate(e.target.value)} /></label>
      <label className="keepsake-field">Что хочется запомнить<textarea rows={3} maxLength={1000} placeholder="Готовили в дождливое воскресенье…" value={caption} onChange={(e) => setCaption(e.target.value)} /></label>
      {photo && !removePhoto && !file && <img className="memory-form__photo" src={photo} alt="Фото воспоминания" />}
      <label className="keepsake-field">{initial?.photo ? "Заменить фото" : "Фото этого момента (необязательно)"}
        <input type="file" accept="image/*" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setRemovePhoto(false); }} /></label>
      {file && <button type="button" className="btn btn--text" onClick={() => setFile(null)}>Не добавлять выбранное фото</button>}
      {initial?.photo && !file && <label className="memory-form__remove"><input type="checkbox" checked={removePhoto} onChange={(e) => setRemovePhoto(e.target.checked)} /> Удалить фото из воспоминания</label>}
      <div className="keepsake-actions"><button type="submit" className="btn btn--accent">{busy ? "Сохраняю…" : "Сохранить воспоминание"}</button><button type="button" className="btn btn--ghost" onClick={onClose}>Отмена</button></div>
    </fieldset>
    {error && <p role="alert">{error}</p>}
  </form>;
}

export function Memories() {
  const [params] = useSearchParams();
  return <MemoriesView key={params.toString()} initialRecipe={Object.hasOwn(recipeMap, params.get("recipe") ?? "") ? params.get("recipe")! : ""} />;
}

function MemoriesView({ initialRecipe }: { initialRecipe: string }) {
  const { memories } = useStore();
  const [editing, setEditing] = useState<Memory | "new" | null>(initialRecipe ? "new" : null);
  const formAnchor = useRef<HTMLDivElement>(null);
  const edit = (m: Memory | "new") => { setEditing(m); requestAnimationFrame(() => { formAnchor.current?.scrollIntoView({ block: "start" }); formAnchor.current?.querySelector("select")?.focus({ preventScroll: true }); }); };
  const sorted = [...memories].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  return <main className="wrap keepsakes-page">
    <header className="page-head"><Link to="/kitchen" className="btn btn--text">← Моя кухня</Link><p className="keepsake-kicker">Было вкусно. Было вместе.</p>
      <h1 className="page-title">Наши воспоминания</h1><p className="page-sub">Блюда, вечера и маленькие истории, которые хочется сохранить.</p></header>
    <div ref={formAnchor} className="memory-form-anchor">
      {editing ? <MemoryForm key={editing === "new" ? "new" : editing.id} initial={editing === "new" ? undefined : editing} initialRecipe={initialRecipe} onClose={() => setEditing(null)} /> :
        <button type="button" className="btn btn--accent" onClick={() => edit("new")}>Добавить воспоминание</button>}
    </div>
    <p className="journal__hint">Альбом хранится на этом устройстве. При переносе сохраняются даты и подписи, фотографии остаются здесь.</p>
    {sorted.length ? <div className="memories-grid">{sorted.map((m) => <MemoryCard key={m.id} memory={m} editable={!editing} onEdit={() => edit(m)} />)}</div> :
      <div className="empty"><p className="empty__title">Первый вечер ещё впереди</p><p>Сохраните фото и пару слов о блюде — здесь начнётся ваш альбом.</p></div>}
  </main>;
}
