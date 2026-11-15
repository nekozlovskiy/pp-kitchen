import { recipeMap } from "../data";

export type Person = "anya" | "danya";
export type CoupleLikes = Record<string, { anya: boolean; danya: boolean }>;
export type Memory = { id: string; recipeId: string; date: string; caption: string; photo?: number };
const record = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);

export function cleanCoupleLikes(raw: unknown): CoupleLikes {
  if (!record(raw)) return {};
  return Object.fromEntries(Object.entries(raw).filter(([id, v]) => Object.hasOwn(recipeMap, id) && record(v))
    .map(([id, v]) => [id, { anya: (v as Record<string, unknown>).anya === true, danya: (v as Record<string, unknown>).danya === true }]));
}

export function toggleCoupleLike(likes: CoupleLikes, id: string, person: Person): CoupleLikes {
  if (!Object.hasOwn(recipeMap, id)) return likes;
  const prev = likes[id] ?? { anya: false, danya: false };
  return { ...likes, [id]: { ...prev, [person]: !prev[person] } };
}

export function validMemoryDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function cleanMemories(raw: unknown): Memory[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  return raw.flatMap((m): Memory[] => {
    if (!record(m) || typeof m.id !== "string" || !/^[\w-]{1,100}$/.test(m.id) || seen.has(m.id) ||
      typeof m.recipeId !== "string" || !m.recipeId || typeof m.date !== "string" || !validMemoryDate(m.date) || typeof m.caption !== "string") return [];
    seen.add(m.id);
    return [{ id: m.id, recipeId: m.recipeId, date: m.date, caption: m.caption.slice(0, 1000),
      ...(typeof m.photo === "number" && Number.isFinite(m.photo) && m.photo > 0 ? { photo: m.photo } : {}) }];
  });
}

export const memoryPhotoKey = (id: string) => `memory:${id}`;
