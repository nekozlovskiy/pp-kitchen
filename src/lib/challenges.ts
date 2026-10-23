import { isProteinDense, recipeMap } from "../data";
import { collectionMap, daysSince, seasonCollection } from "./collections";
import { todayKey } from "./format";
import { readJSON, writeJSON } from "./storage";
import type { Recipe } from "../types";

type Entry = { cooked?: number; last?: string; dates?: string[] };
type Journal = Record<string, Entry | undefined>;

export const CHALLENGE_DAYS = 30;

// Кухни для «Кругосветки» — по названию блюда.
const CUISINES: [string, RegExp][] = [
  ["грузинская", /хачапури|хинкали|пхали|чахохбили|лобио|аджапсандал|сациви/i],
  ["итальянская", /паст[аы]|пицц|ризотто|лазань|альфредо|капрезе|минестроне|брускетт|фриттат|ньокки|карбонар/i],
  ["азиатская", /чачжанм|кимчи|пибимпап|терияки|фунчоз|удон|соба|вок|мисо|жареный рис|поке|рамен|том ям|пад тай/i],
  ["мексиканская", /тако|буррито|кесадиль|гуакамоле|энчилад|начос|фахитос/i],
  ["восточная", /шаурм|хумус|фалафел|шакшук|табуле|кускус|лахмаджун|долм|плов|машхурда|маджадр/i],
  ["индийская", /карри|\bдал\b|масур|панир|тикка|бирьяни/i],
  ["французская", /киш|рататуй|тиан|крок-|суфле|бланманже|клафути|конфи/i],
];

export const cuisineOf = (title: string): string | null => CUISINES.find(([, re]) => re.test(title))?.[0] ?? null;

type Challenge = {
  id: string;
  emoji: string;
  title: string;
  hint: string;
  target: number;
  /** Сколько засчитано: по рецептам, приготовленным с даты старта. */
  progress: (cooked: Recipe[], firstCooked: (id: string) => string | undefined, start: string) => number;
};

const season = seasonCollection();
const NO_MACROS = { macros: { kcal: 0, p: 0, f: 0, c: 0 } };

/** Задания на выбор: считаются по отметкам «Приготовлено», каждое блюдо — один раз. */
export const challenges: Challenge[] = [
  {
    id: "new",
    emoji: "🆕",
    title: "Новенькое",
    hint: "5 блюд, которые ещё ни разу не готовила",
    target: 5,
    progress: (cooked, first, start) => cooked.filter((r) => (first(r.id) ?? "") >= start).length,
  },
  {
    id: "protein-morning",
    emoji: "💪",
    title: "Белковое утро",
    hint: "5 разных белковых завтраков",
    target: 5,
    progress: (cooked) => cooked.filter((r) => r.category === "breakfast" && isProteinDense(r.id)).length,
  },
  {
    id: "season",
    emoji: "🍂",
    title: "Сезонное",
    hint: `4 блюда из подборки «${season.title}»`,
    target: 4,
    progress: (cooked) => cooked.filter((r) => season.test(r, NO_MACROS)).length,
  },
  {
    id: "reels",
    emoji: "🎬",
    title: "Из рилсов",
    hint: "3 блюда с видео",
    target: 3,
    progress: (cooked) => cooked.filter((r) => Boolean(r.video)).length,
  },
  {
    id: "no-sugar",
    emoji: "🍫",
    title: "Сладко без сахара",
    hint: "3 десерта без сахара и мёда",
    target: 3,
    progress: (cooked) => cooked.filter((r) => collectionMap["no-sugar"].test(r, NO_MACROS)).length,
  },
  {
    id: "world",
    emoji: "🌍",
    title: "Кругосветка",
    hint: "4 блюда разных кухонь: хачапури, паста, тако, карри…",
    target: 4,
    progress: (cooked) => new Set(cooked.map((r) => cuisineOf(r.title)).filter(Boolean)).size,
  },
];

export const challengeMap = Object.fromEntries(challenges.map((c) => [c.id, c]));

const datesOf = (e: Entry | undefined) => (e?.dates?.length ? e.dates : e?.last ? [e.last] : []);

/** Прогресс задания: блюда, приготовленные с даты старта (каждое один раз). */
export function challengeProgress(journal: Journal, id: string, start: string): { value: number; target: number; done: boolean } {
  const c = challengeMap[id];
  const cooked = Object.entries(journal)
    .filter(([rid, e]) => recipeMap[rid] && datesOf(e).some((d) => d >= start))
    .map(([rid]) => recipeMap[rid]);
  const first = (rid: string) => [...datesOf(journal[rid])].sort()[0];
  const value = Math.min(c.progress(cooked, first, start), c.target);
  return { value, target: c.target, done: value >= c.target };
}

export type Active = { id: string; start: string };

export function readActive(): Active | null {
  const a = readJSON<Active | null>("pp.challenge", null);
  return a && challengeMap[a.id] && typeof a.start === "string" ? a : null;
}

export function saveActive(a: Active | null): void {
  writeJSON("pp.challenge", a);
}

export function readDone(): { id: string; date: string }[] {
  const d = readJSON<{ id: string; date: string }[]>("pp.challengesDone", []);
  return Array.isArray(d) ? d.filter((x) => challengeMap[x?.id]) : [];
}

export function addDone(id: string, date = todayKey()): void {
  writeJSON("pp.challengesDone", [...readDone(), { id, date }]);
}

/** Сколько дней осталось; 0 и меньше — время вышло. */
export const daysLeft = (start: string, today = new Date()) => CHALLENGE_DAYS - daysSince(start, today);
