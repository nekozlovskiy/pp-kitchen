import { useStore } from "../hooks/useStore";
import { lastDays } from "../lib/history";

const WEEKDAY = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const W = 320;
const H = 150;
const BASE = 122; // линия основания столбиков
const TOP = 18;

const dateOf = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const label = (key: string) => dateOf(key).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });

/** Калории за последние 7 дней: столбики, пунктир цели и средние цифры текстом. */
export function WeekChart() {
  const { history, goal } = useStore();
  const days = lastDays(history, 7);
  const filled = days.filter((d) => d.totals);
  // Показываем, когда есть хотя бы один прошлый день: на одном сегодняшнем графику нечего сравнивать.
  if (!days.slice(0, -1).some((d) => d.totals)) return null;

  const max = Math.max(goal * 1.2, ...filled.map((d) => d.totals!.kcal));
  const y = (kcal: number) => BASE - ((BASE - TOP) * kcal) / max;
  const step = W / 7;
  const bw = 26;
  // Сегодняшний день ещё не закончен: средние считаем только по прошлым дням.
  const past = days.slice(0, -1).filter((d) => d.totals);
  const avg = (k: "kcal" | "p") => Math.round(past.reduce((a, d) => a + d.totals![k], 0) / past.length);
  const inGoal = past.filter((d) => Math.abs(d.totals!.kcal - goal) <= goal * 0.1).length;
  // Месяц показываем, только когда в нём есть дни сверх последней недели — иначе это те же цифры.
  const month = lastDays(history, 30).slice(0, -1).filter((d) => d.totals);
  const monthAvg = (k: "kcal" | "p") => Math.round(month.reduce((a, d) => a + d.totals![k], 0) / month.length);

  return (
    <section className="week-chart" aria-labelledby="week-chart-title">
      <h2 id="week-chart-title" className="menu__title">
        Последние 7 дней
      </h2>
      <svg viewBox={`0 0 ${W} ${H}`} className="week-chart__svg" role="img" aria-label={`Калории за 7 дней, в среднем ${avg("kcal")} ккал при цели ${goal}`}>
        <line x1={0} x2={W} y1={y(goal)} y2={y(goal)} className="week-chart__goal" />
        <text x={W} y={y(goal) - 5} textAnchor="end" className="week-chart__goal-label">
          цель {goal}
        </text>
        <line x1={0} x2={W} y1={BASE} y2={BASE} className="week-chart__axis" />
        {days.map((d, i) => {
          const cx = step * i + step / 2;
          const today = i === days.length - 1;
          const k = d.totals?.kcal ?? 0;
          const top = y(k);
          const r = Math.min(4, (BASE - top) / 2);
          return (
            <g key={d.date}>
              <title>
                {d.totals ? `${label(d.date)}: ${Math.round(k)} ккал, белок ${Math.round(d.totals.p)} г` : `${label(d.date)}: нет записей`}
              </title>
              <rect x={cx - step / 2} y={TOP} width={step} height={BASE - TOP + 24} fill="transparent" />
              {d.totals && (
                <path
                  className={today ? "week-chart__bar is-today" : "week-chart__bar"}
                  d={`M${cx - bw / 2},${BASE} V${top + r} Q${cx - bw / 2},${top} ${cx - bw / 2 + r},${top} H${cx + bw / 2 - r} Q${cx + bw / 2},${top} ${cx + bw / 2},${top + r} V${BASE} Z`}
                />
              )}
              {today && d.totals && (
                <text x={cx} y={top - 6} textAnchor="middle" className="week-chart__value">
                  {Math.round(k)}
                </text>
              )}
              <text x={cx} y={BASE + 18} textAnchor="middle" className={today ? "week-chart__day is-today" : "week-chart__day"}>
                {today ? "Сег." : WEEKDAY[dateOf(d.date).getDay()]}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="week-chart__sum">
        До сегодня в среднем <b>{avg("kcal")} ккал</b> и <b>{avg("p")} г белка</b> в день · в пределах цели ±10% — {inGoal} из {past.length}
      </p>
      {month.length > past.length && (
        <p className="week-chart__sum">
          За 30 дней в среднем <b>{monthAvg("kcal")} ккал</b> и <b>{monthAvg("p")} г белка</b> в день · дней с записями — {month.length}
        </p>
      )}
      <table className="visually-hidden">
        <caption>Калории и белок по дням</caption>
        <tbody>
          {filled.map((d) => (
            <tr key={d.date}>
              <th scope="row">{label(d.date)}</th>
              <td>{Math.round(d.totals!.kcal)} ккал</td>
              <td>{Math.round(d.totals!.p)} г белка</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
