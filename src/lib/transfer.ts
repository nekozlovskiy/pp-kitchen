import { readJSON, writeJSON } from "./storage";

/** Что переносим на другое устройство. Таймеры не нужны, фото лежат отдельно и слишком тяжёлые. */
export const TRANSFER_KEYS = [
  "pp.favorites",
  "pp.journal",
  "pp.day",
  "pp.week",
  "pp.shopping",
  "pp.goal",
  "pp.proteinGoal",
  "pp.exclude",
  "pp.pantry",
  "pp.swaps",
  "pp.history",
] as const;

export type Bundle = { v: 1; at: string; data: Record<string, unknown> };

const PREFIX = "PP1:";

export function exportBundle(): Bundle {
  const data: Record<string, unknown> = {};
  for (const key of TRANSFER_KEYS) {
    const value = readJSON<unknown>(key, undefined);
    if (value !== undefined) data[key] = value;
  }
  // Номер фото ссылается на хранилище этого телефона — на другом его нет.
  const journal = data["pp.journal"];
  if (journal && typeof journal === "object") {
    data["pp.journal"] = Object.fromEntries(
      Object.entries(journal as Record<string, Record<string, unknown>>).map(([id, e]) => {
        const { photo: _photo, ...rest } = e ?? {};
        return [id, rest];
      }),
    );
  }
  return { v: 1, at: new Date().toISOString().slice(0, 10), data };
}

function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromBase64(code: string): string {
  const bin = atob(code);
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export function encodeBundle(bundle: Bundle): string {
  return PREFIX + toBase64(JSON.stringify(bundle));
}

/** Разбирает код или содержимое файла. Возвращает null, если это не наши данные. */
export function decodeBundle(input: string): Bundle | null {
  const text = input.trim();
  try {
    const json = text.startsWith(PREFIX) ? fromBase64(text.slice(PREFIX.length).replace(/\s+/g, "")) : text;
    const parsed = JSON.parse(json) as Bundle;
    if (parsed?.v !== 1 || !parsed.data || typeof parsed.data !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Записывает перенесённые данные поверх текущих. Неизвестные ключи пропускаются. */
export function importBundle(bundle: Bundle): number {
  let n = 0;
  for (const key of TRANSFER_KEYS) {
    if (key in bundle.data) {
      writeJSON(key, bundle.data[key]);
      n++;
    }
  }
  return n;
}
