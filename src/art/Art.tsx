import type { ReactElement } from "react";
import type { ArtKind, Category } from "../types";

// Авторские «натюрморты»: линия чернилами поверх акварельного пятна категории.
// Цвета берутся из CSS-переменных, поэтому иллюстрации сами перекрашиваются в тёмной теме.

const ink = { stroke: "var(--ink)", strokeWidth: 2.4, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const surface = "var(--surface)";

const blobs = [
  "M28 92C18 52 58 16 106 20s82 30 74 74-50 54-92 52S38 128 28 92Z",
  "M34 70C40 32 92 14 134 30s54 58 34 86-70 36-104 22S28 104 34 70Z",
  "M24 84c4-38 46-64 90-60s76 36 66 72-56 52-96 46S20 118 24 84Z",
];

function hash(s: string): number {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

const drawings: Record<ArtKind, ReactElement> = {
  plate: (
    <g>
      <ellipse cx="100" cy="104" rx="72" ry="28" fill={surface} {...ink} />
      <ellipse cx="100" cy="100" rx="50" ry="17" fill="var(--food-cream)" {...ink} strokeWidth={1.6} />
      <path d="M70 96c4-14 22-20 34-12 6-8 20-6 24 4 6 2 8 8 4 12-20 8-48 8-62-4Z" fill="var(--food-crust)" {...ink} />
      <circle cx="118" cy="92" r="9" fill="var(--food-red)" {...ink} />
      <path d="M78 90c-10-12-4-26 10-28-2 12-2 20-10 28Z" fill="var(--food-green)" {...ink} />
      <path d="M88 64v-8M100 60v-10M112 64v-8" {...ink} strokeWidth={1.8} opacity={0.5} />
    </g>
  ),
  bowl: (
    <g>
      <path d="M40 84h120c0 34-26 52-60 52S40 118 40 84Z" fill={surface} {...ink} />
      <path d="M48 84c6-18 26-26 40-20 10-12 32-10 40 2 14-2 24 6 24 18" fill="var(--food-cream)" {...ink} />
      <circle cx="76" cy="74" r="8" fill="var(--food-red)" {...ink} />
      <circle cx="92" cy="70" r="6" fill="var(--food-red)" {...ink} />
      <path d="M112 76c4-14 22-18 30-8-10 2-18 8-30 8Z" fill="var(--food-green)" {...ink} />
      <path d="M124 64c2-6 6-10 12-10" {...ink} fill="none" />
      <path d="M86 136h28" {...ink} />
    </g>
  ),
  soup: (
    <g>
      <path d="M36 82h128c0 36-28 56-64 56S36 118 36 82Z" fill={surface} {...ink} />
      <ellipse cx="100" cy="82" rx="64" ry="12" fill="var(--food-yolk)" {...ink} />
      <circle cx="84" cy="80" r="3" fill="var(--food-green)" />
      <circle cx="108" cy="83" r="2.5" fill="var(--food-green)" />
      <circle cx="120" cy="79" r="2" fill="var(--food-green)" />
      <path d="M80 60c-6-8 6-12 0-20M100 58c-6-8 6-12 0-20M120 60c-6-8 6-12 0-20" {...ink} fill="none" opacity={0.55} />
      <path d="M146 70l26-34" {...ink} />
      <ellipse cx="174" cy="32" rx="7" ry="5" transform="rotate(-50 174 32)" fill={surface} {...ink} />
    </g>
  ),
  glass: (
    <g>
      <path d="M72 34h56l-8 104H80Z" fill={surface} {...ink} />
      <path d="M75 70h50l-3 36H78Z" fill="var(--food-red)" opacity={0.85} />
      <path d="M78 106h44l-2 32H80Z" fill="var(--food-cream)" />
      <path d="M74 52h52l-1 18H75Z" fill="var(--food-cream)" />
      <path d="M72 34h56l-8 104H80Z" fill="none" {...ink} />
      <circle cx="112" cy="34" r="10" fill="var(--food-red)" {...ink} />
      <path d="M112 24c2-6 8-8 12-6" {...ink} fill="none" />
      <path d="M90 34l-14-22" {...ink} />
    </g>
  ),
  jar: (
    <g>
      <rect x="64" y="40" width="72" height="98" rx="16" fill={surface} {...ink} />
      <path d="M66 96h68v26c0 9-7 14-16 14H82c-9 0-16-5-16-14Z" fill="var(--food-crust)" />
      <path d="M66 72h68v24H66Z" fill="var(--food-cream)" />
      <circle cx="84" cy="66" r="7" fill="var(--food-red)" {...ink} />
      <circle cx="100" cy="64" r="6" fill="var(--food-red)" {...ink} />
      <circle cx="116" cy="67" r="7" fill="var(--food-red)" {...ink} />
      <rect x="64" y="40" width="72" height="98" rx="16" fill="none" {...ink} />
      <rect x="60" y="28" width="80" height="14" rx="6" fill="var(--food-yolk)" {...ink} />
      <path d="M140 56l28-30" {...ink} />
      <ellipse cx="170" cy="23" rx="8" ry="5" transform="rotate(-45 170 23)" fill={surface} {...ink} />
    </g>
  ),
  pan: (
    <g>
      <path d="M150 96l40-14" {...ink} strokeWidth={7} />
      <circle cx="96" cy="96" r="56" fill={surface} {...ink} />
      <circle cx="96" cy="96" r="46" fill="var(--food-cream)" {...ink} strokeWidth={1.6} />
      <path d="M62 92c-6-16 10-28 22-20 10-8 26 0 22 14 8 10-4 24-18 18-12 8-30-2-26-12Z" fill={surface} {...ink} />
      <circle cx="84" cy="92" r="9" fill="var(--food-yolk)" {...ink} />
      <path d="M100 112c-2-12 12-18 20-12 10-4 18 6 12 14-2 10-16 12-22 6-8 2-12-2-10-8Z" fill={surface} {...ink} />
      <circle cx="116" cy="110" r="7" fill="var(--food-yolk)" {...ink} />
      <path d="M110 72c4-8 14-8 18-2-6 2-12 4-18 2Z" fill="var(--food-green)" {...ink} />
    </g>
  ),
  cake: (
    <g>
      <ellipse cx="100" cy="130" rx="70" ry="12" fill={surface} {...ink} />
      <path d="M44 78v42c0 8 25 14 56 14s56-6 56-14V78" fill="var(--food-crust)" {...ink} />
      <path d="M44 100c0 8 25 14 56 14s56-6 56-14" fill="none" {...ink} strokeWidth={1.6} opacity={0.6} />
      <ellipse cx="100" cy="78" rx="56" ry="14" fill="var(--food-cream)" {...ink} />
      <circle cx="82" cy="74" r="7" fill="var(--food-red)" {...ink} />
      <circle cx="102" cy="70" r="6" fill="var(--food-red)" {...ink} />
      <circle cx="120" cy="76" r="7" fill="var(--food-red)" {...ink} />
      <path d="M94 66c2-8 10-10 14-6-4 2-8 4-14 6Z" fill="var(--food-green)" {...ink} />
    </g>
  ),
  cookies: (
    <g>
      <circle cx="74" cy="96" r="30" fill="var(--food-crust)" {...ink} />
      <circle cx="128" cy="88" r="26" fill="var(--food-crust)" {...ink} />
      <circle cx="110" cy="124" r="22" fill="var(--food-crust)" {...ink} />
      {[
        [64, 86], [82, 92], [70, 108], [86, 106], [122, 80], [136, 92], [124, 98], [104, 120], [116, 128],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3.4" fill="var(--ink)" />
      ))}
      <path d="M150 50c4-6 10-6 12 0" {...ink} fill="none" opacity={0.5} />
      <path d="M40 56c4-6 10-6 12 0" {...ink} fill="none" opacity={0.5} />
    </g>
  ),
  roll: (
    <g>
      <g transform="rotate(-18 100 90)">
        <rect x="40" y="66" width="112" height="46" rx="23" fill="var(--food-cream)" {...ink} />
        <ellipse cx="152" cy="89" rx="14" ry="23" fill={surface} {...ink} />
        <path d="M146 80c8-6 14 4 8 10-6 6-14-2-8-8" {...ink} fill="none" />
        <path d="M146 72c6 4 8 10 6 16" fill="none" stroke="var(--food-green)" strokeWidth={4} strokeLinecap="round" />
        <path d="M150 104c4-2 8-6 8-10" fill="none" stroke="var(--food-red)" strokeWidth={4} strokeLinecap="round" />
        <path d="M70 70v38M100 68v42" {...ink} strokeWidth={1.4} opacity={0.4} />
      </g>
    </g>
  ),
  toast: (
    <g>
      <path d="M52 132V74c-12-6-12-30 10-34 18-14 58-14 76 0 22 4 22 28 10 34v58Z" fill="var(--food-crust)" {...ink} />
      <path d="M62 128V78c-8-6-6-22 8-26 16-10 44-10 60 0 14 4 16 20 8 26v50Z" fill="var(--food-cream)" />
      <path d="M68 92c10-14 30-16 40-8 12-8 30-4 32 8-6 14-62 14-72 0Z" fill="var(--food-green)" {...ink} />
      <ellipse cx="100" cy="98" rx="20" ry="12" fill={surface} {...ink} />
      <circle cx="102" cy="98" r="7" fill="var(--food-yolk)" {...ink} />
      <circle cx="76" cy="108" r="6" fill="var(--food-red)" {...ink} />
      <circle cx="126" cy="108" r="6" fill="var(--food-red)" {...ink} />
    </g>
  ),
  pancakes: (
    <g>
      <ellipse cx="100" cy="134" rx="66" ry="12" fill={surface} {...ink} />
      <ellipse cx="100" cy="120" rx="54" ry="12" fill="var(--food-crust)" {...ink} />
      <ellipse cx="100" cy="104" rx="54" ry="12" fill="var(--food-crust)" {...ink} />
      <ellipse cx="100" cy="88" rx="54" ry="12" fill="var(--food-crust)" {...ink} />
      <path d="M62 86c10-6 66-6 76 0-4 6-12 4-14 10-2 8-8 8-8 0-2-6-40-4-54-10Z" fill="var(--food-yolk)" {...ink} strokeWidth={1.6} />
      <circle cx="94" cy="76" r="8" fill="var(--food-red)" {...ink} />
      <circle cx="110" cy="78" r="6" fill="var(--food-red)" {...ink} />
      <path d="M98 68c2-6 8-8 12-4-4 2-8 4-12 4Z" fill="var(--food-green)" {...ink} />
    </g>
  ),
  fish: (
    <g>
      <ellipse cx="100" cy="104" rx="80" ry="30" fill={surface} {...ink} />
      <path d="M50 100c20-26 66-30 92-4l20-16v40l-20-16c-26 26-72 22-92-4Z" fill="var(--food-crust)" {...ink} />
      <circle cx="68" cy="98" r="3" fill="var(--ink)" />
      <path d="M90 90c6 6 6 14 0 20M108 88c6 7 6 17 0 24" {...ink} fill="none" strokeWidth={1.6} opacity={0.6} />
      <circle cx="132" cy="70" r="13" fill="var(--food-yolk)" {...ink} />
      <path d="M132 57v26M119 70h26M123 61l18 18M141 61l-18 18" {...ink} strokeWidth={1.2} opacity={0.6} />
      <path d="M60 124c6-6 14-6 18 0M84 128c6-6 14-6 18 0" fill="none" stroke="var(--food-green)" strokeWidth={4} strokeLinecap="round" />
    </g>
  ),
};

const tint: Record<Category, string> = {
  breakfast: "var(--tint-breakfast)",
  lunch: "var(--tint-lunch)",
  dinner: "var(--tint-dinner)",
  snack: "var(--tint-snack)",
  dessert: "var(--tint-dessert)",
};

export function Art({
  kind,
  category,
  seed,
  className,
}: {
  kind: ArtKind;
  category: Category;
  seed: string;
  className?: string;
}) {
  const h = hash(seed);
  const blob = blobs[h % blobs.length];
  const wash = blobs[(h >> 2) % blobs.length];
  const tilt = ((h >> 3) % 9) - 4;
  const flip = (h >> 6) % 2 === 1;
  const dx = ((h >> 8) % 21) - 10;
  return (
    <svg className={className} viewBox="0 0 200 160" aria-hidden="true" focusable="false">
      {/* Два слоя пятна со сдвигом дают эффект акварельной заливки */}
      <path d={wash} fill={tint[category]} opacity={0.55} transform={`translate(${dx} 6) rotate(${-tilt * 3} 100 80) scale(1.04)`} />
      <path d={blob} fill={tint[category]} transform={`rotate(${tilt} 100 80)`} />
      <g transform={`${flip ? "translate(200 0) scale(-1 1) " : ""}rotate(${tilt / 2} 100 90)`}>
        {drawings[kind] ?? drawings.plate}
      </g>
    </svg>
  );
}
