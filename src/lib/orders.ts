import { daysSince } from "./collections";
import { todayKey } from "./format";
import { readJSON, writeJSON } from "./storage";

/**
 * «Ответ на заказ»: её «Приготовь мне» — заказ, его ответ приходит ссылкой обратно.
 * Сервера нет: заказы живут в её браузере, ответ — параметр ссылки ?answer=…
 */
export const ANSWERS = [
  { id: "today", label: "Готовлю сегодня 👨‍🍳" },
  { id: "tomorrow", label: "Завтра" },
  { id: "weekend", label: "В выходные" },
  { id: "other", label: "Давай что-то другое?" },
] as const;

export type AnswerId = (typeof ANSWERS)[number]["id"];
export const answerOf = (id: string | null) => ANSWERS.find((a) => a.id === id);

/** cookedBefore — сколько раз блюдо было приготовлено к моменту заказа: выполнен, когда готовят ещё раз. */
export type Order = { id: string; sent: string; cookedBefore: number; answer?: AnswerId; answered?: string };

const cookedCount = (id: string): number => readJSON<Record<string, { cooked?: number }>>("pp.journal", {})[id]?.cooked ?? 0;

const KEEP_DAYS = 14;
const asDate = (key: string) => new Date(`${key}T12:00:00`);
const dayFmt = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" });

/** Заказы за последние 2 недели (по последнему событию: отправке или ответу). */
export function readOrders(today = new Date()): Order[] {
  const list = readJSON<Order[]>("pp.orders", []);
  if (!Array.isArray(list)) return [];
  return list.filter(
    (o) =>
      typeof o?.id === "string" && typeof o?.sent === "string" && typeof o?.cookedBefore === "number" && daysSince(o.answered ?? o.sent, today) < KEEP_DAYS,
  );
}

function save(list: Order[]): void {
  writeJSON("pp.orders", list);
  // Плашка в рецепте и «Мои заказы» обновляются сразу, а не при следующем открытии.
  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") window.dispatchEvent(new Event("pp-orders"));
}

/** Она отправила «Приготовь мне»: новый заказ на это блюдо заменяет прежний. */
export function addOrder(id: string, date = todayKey(), cookedBefore = cookedCount(id)): void {
  save([...readOrders(asDate(date)).filter((o) => o.id !== id), { id, sent: date, cookedBefore }]);
}

/**
 * Пришёл его ответ на заказ от даты sent. Ответ относится только к своему заказу:
 * старая ссылка не «принимает» новый заказ на то же блюдо и не воскрешает забытый.
 * Если заказа на этом телефоне нет (отправляли с другого) — заводим, пока он свежий.
 * true — ответ записан впервые.
 */
export function answerOrder(id: string, answer: AnswerId, sent: string, date = todayKey(), cookedNow = cookedCount(id)): boolean {
  const list = readOrders(asDate(date));
  const prev = list.find((o) => o.id === id);
  if (prev && prev.sent !== sent) return false;
  if (!prev && (!/^\d{4}-\d{2}-\d{2}$/.test(sent) || daysSince(sent, asDate(date)) >= KEEP_DAYS || sent > date)) return false;
  if (prev?.answer === answer) return false; // повторное открытие той же ссылки
  save([...list.filter((o) => o.id !== id), { id, sent, cookedBefore: prev?.cookedBefore ?? cookedNow, answer, answered: date }]);
  return true;
}

/** Статус заказа словами. «Сегодня» и «завтра» считаются от дня ответа, а не застывают на две недели. */
export function orderStatus(o: Order, cookedNow = 0, today = todayKey()): string {
  if (isCooked(o, cookedNow)) return "Заказ выполнен 🤍";
  if (!o.answer || !o.answered) return "Заказ отправлен · ждёт ответа";
  if (o.answer === "other") return "Просит выбрать другое блюдо";
  if (o.answer === "weekend") return "Заказ принят · в выходные";
  const offset = o.answer === "tomorrow" ? 1 : 0;
  const ago = daysSince(o.answered, asDate(today)) - offset; // >0 — день уже прошёл
  const when = ago === 0 ? "сегодня" : ago === -1 ? "завтра" : ago === 1 ? "вчера" : dayFmt.format(new Date(asDate(o.answered).getTime() + offset * 86_400_000));
  return `Заказ принят · ${when}`;
}

/** Заказ выполнен, если блюдо приготовили ещё раз после заказа. */
export const isCooked = (o: Order, cookedNow = 0) => cookedNow > o.cookedBefore;

/** Подписка на изменения заказов (для плашки и списка). */
export function onOrdersChange(cb: () => void): () => void {
  window.addEventListener("pp-orders", cb);
  return () => window.removeEventListener("pp-orders", cb);
}

const base = () => `${location.origin}${location.pathname}#/recipe/`;
export const orderLink = (id: string, sent: string) => `${base()}${id}?order=${sent}`;
export const answerLink = (id: string, answer: AnswerId, sent: string) => `${base()}${id}?answer=${answer}&sent=${sent}`;
