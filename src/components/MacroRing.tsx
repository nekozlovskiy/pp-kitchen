import type { ReactNode } from "react";
import type { Macros } from "../types";
import { macroPercents } from "../lib/nutrition";

/** Кольцо КБЖУ: доли по калориям (4·Б, 9·Ж, 4·У), а не по граммам. */
export function MacroRing({
  macros,
  size = 40,
  stroke,
  children,
  label,
}: {
  macros: Macros;
  size?: number;
  stroke?: number;
  children?: ReactNode;
  label?: string;
}) {
  const sw = stroke ?? Math.max(4, size / 9);
  const r = (size - sw) / 2;
  const len = 2 * Math.PI * r;
  const pc = macroPercents(macros);
  const gap = pc.p && pc.f && pc.c ? Math.min(3, len * 0.01) : 0;
  const parts = [
    { key: "p", v: pc.p, color: "var(--protein)" },
    { key: "f", v: pc.f, color: "var(--fat)" },
    { key: "c", v: pc.c, color: "var(--carb)" },
  ];
  let offset = 0;
  return (
    <div className="ring" style={{ width: size, height: size }} role="img" aria-label={label ?? `Белки ${pc.p}%, жиры ${pc.f}%, углеводы ${pc.c}% калорий`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={sw} />
        {parts.map((p) => {
          const dash = Math.max(0, (p.v / 100) * len - gap);
          const el = (
            <circle
              key={p.key}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={p.color}
              strokeWidth={sw}
              strokeDasharray={`${dash} ${len - dash}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          );
          offset += (p.v / 100) * len;
          return el;
        })}
      </svg>
      {children && <div className="ring__center">{children}</div>}
    </div>
  );
}
