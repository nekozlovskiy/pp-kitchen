// При недоступном хранилище держим последние изменения в памяти до повторной
// записи или экспорта. Обновление/закрытие вкладки эту временную копию потеряет.
const pending = new Map<string, string | null>();
const listeners = new Set<() => void>();
export const notifyStorageChange = () => listeners.forEach((listener) => listener());

export const hasUnsavedChanges = () => pending.size > 0;
export function subscribeStorage(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = pending.has(key) ? pending.get(key) : window.localStorage.getItem(key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown): void {
  const raw = JSON.stringify(value);
  if (raw === undefined) return;
  try {
    window.localStorage.setItem(key, raw);
    if (pending.delete(key)) notifyStorageChange();
  } catch {
    const firstFailure = pending.size === 0;
    pending.set(key, raw);
    if (firstFailure) notifyStorageChange();
  }
}

/** Успех других ключей не должен скрывать оставшиеся несохранённые записи. */
export function retryStorageWrites(): boolean {
  for (const [key, raw] of pending) {
    try {
      if (raw === null) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, raw);
      pending.delete(key);
    } catch {
      // Временная копия остаётся доступной для экспорта.
    }
  }
  notifyStorageChange();
  return !hasUnsavedChanges();
}

/** Удаление тоже проходит через временную копию, чтобы не воскресить старую запись. */
export function removeJSON(key: string): void {
  try {
    window.localStorage.removeItem(key);
    if (pending.delete(key)) notifyStorageChange();
  } catch {
    const firstFailure = pending.size === 0;
    pending.set(key, null);
    if (firstFailure) notifyStorageChange();
  }
}
