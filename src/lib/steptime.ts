/** Кусок текста шага: обычный текст или упоминание времени, из которого можно завести таймер. */
export type StepPart = { text: string; seconds?: number };

const num = String.raw`(\d+(?:,\d+)?)`;
const range = String.raw`${num}(?:\s*[–—-]\s*${num})?`;
// «25–30 минут», «1,5—2 минуты», «5 мин», «30–40 секунд», «1–2 часа», а также «полчаса» и «на час».
const pattern = new RegExp(
  String.raw`${range}\s*(минут[аы]?|мин\.?|секунд[аы]?|сек\.?|час(?:а|ов)?)(?![а-яё])|полчаса|(?<=\sна )час(?![а-яё])`,
  "gi",
);

const toNumber = (s: string) => Number(s.replace(",", "."));

/**
 * Делит шаг на части и находит в нём время. Для диапазона таймер ставится на нижнюю границу:
 * проверить готовность лучше раньше, чем позже.
 */
export function splitStep(step: string): StepPart[] {
  const parts: StepPart[] = [];
  let last = 0;
  for (const m of step.matchAll(pattern)) {
    const word = m[0].toLowerCase();
    let seconds: number;
    if (word === "полчаса") seconds = 30 * 60;
    else if (word === "час") seconds = 60 * 60;
    else {
      const unit = m[3].toLowerCase();
      const mult = unit.startsWith("сек") ? 1 : unit.startsWith("час") ? 3600 : 60;
      seconds = Math.round(toNumber(m[1]) * mult);
    }
    if (seconds <= 0) continue;
    if (m.index > last) parts.push({ text: step.slice(last, m.index) });
    parts.push({ text: m[0], seconds });
    last = m.index + m[0].length;
  }
  if (last < step.length) parts.push({ text: step.slice(last) });
  return parts;
}

/** "25:00", "1:05:00" */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}
