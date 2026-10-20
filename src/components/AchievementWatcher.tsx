import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useStore } from "../hooks/useStore";
import { kitchenStats } from "../lib/kitchen";

const COLORS = ["var(--accent)", "var(--food-yolk)", "var(--food-green)", "var(--food-red)", "var(--protein)"];

/** Следит за отметками и празднует новое достижение: конфетти и сообщение. Уже полученные при открытии сайта не празднуются. */
export function AchievementWatcher() {
  const { journal, showToast } = useStore();
  const done = useMemo(() => kitchenStats(journal).achievements.filter((a) => a.done), [journal]);
  const seen = useRef<Set<string> | null>(null);
  const [burst, setBurst] = useState(0);

  useEffect(() => {
    const ids = new Set(done.map((a) => a.id));
    if (seen.current) {
      const fresh = done.filter((a) => !seen.current!.has(a.id));
      if (fresh.length) {
        showToast(`Новое достижение: ${fresh.map((a) => a.title).join(", ")}!`);
        if (!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) setBurst((b) => b + 1);
      }
    }
    seen.current = ids;
  }, [done, showToast]);

  useEffect(() => {
    if (!burst) return;
    const t = window.setTimeout(() => setBurst(0), 2600);
    return () => window.clearTimeout(t);
  }, [burst]);

  if (!burst) return null;
  return (
    <div className="confetti" aria-hidden="true" key={burst}>
      {Array.from({ length: 42 }, (_, i) => (
        <span
          key={i}
          style={
            {
              left: `${(i * 23 + 7) % 100}%`,
              background: COLORS[i % COLORS.length],
              animationDelay: `${(i % 7) * 0.06}s`,
              "--x": `${((i * 37) % 120) - 60}px`,
              "--r": `${(i * 53) % 720}deg`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
