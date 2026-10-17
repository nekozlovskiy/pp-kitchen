// localStorage может быть недоступен (приватный режим, запрет cookies).
// Сайт при этом работает, просто ничего не запоминает между визитами.

export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* хранилище недоступно или переполнено — пропускаем */
  }
}
