import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { readJSON, writeJSON } from "../lib/storage";

export type Timer = { id: string; label: string; recipeTitle: string; endsAt: number; done?: boolean };

type Timers = {
  timers: Timer[];
  now: number;
  start: (label: string, seconds: number, recipeTitle: string) => void;
  remove: (id: string) => void;
};

const Ctx = createContext<Timers | null>(null);

/** Короткий сигнал через Web Audio: без звуковых файлов и работает офлайн. */
function beep() {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    [0, 0.35, 0.7].forEach((t) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.25);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.3);
    });
    setTimeout(() => ctx.close(), 1500);
  } catch {
    /* без звука тоже работает: остаются вибрация и надпись */
  }
  try {
    navigator.vibrate?.([300, 150, 300, 150, 300]);
  } catch {
    /* вибрации нет */
  }
}

export function TimersProvider({ children }: { children: ReactNode }) {
  // Время окончания хранится абсолютным, поэтому таймер переживает перезагрузку страницы.
  const [timers, setTimers] = useState<Timer[]>(() =>
    readJSON<Timer[]>("pp.timers", []).filter((t) => t && typeof t.endsAt === "number"),
  );
  const [now, setNow] = useState(() => Date.now());
  const rang = useRef(new Set(timers.filter((t) => t.done).map((t) => t.id)));

  useEffect(() => writeJSON("pp.timers", timers), [timers]);

  const running = timers.some((t) => !t.done);
  useEffect(() => {
    if (!running) return;
    const tick = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(tick);
  }, [running]);

  useEffect(() => {
    const finished = timers.filter((t) => !t.done && t.endsAt <= now);
    if (!finished.length) return;
    if (finished.some((t) => !rang.current.has(t.id))) beep();
    finished.forEach((t) => rang.current.add(t.id));
    setTimers((ts) => ts.map((t) => (t.endsAt <= now ? { ...t, done: true } : t)));
  }, [now, timers]);

  const start = useCallback((label: string, seconds: number, recipeTitle: string) => {
    const t = Date.now();
    setNow(t);
    setTimers((ts) => [...ts, { id: `${t}-${Math.random().toString(36).slice(2, 6)}`, label, recipeTitle, endsAt: t + seconds * 1000 }]);
  }, []);
  const remove = useCallback((id: string) => setTimers((ts) => ts.filter((t) => t.id !== id)), []);

  const value = useMemo(() => ({ timers, now, start, remove }), [timers, now, start, remove]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTimers(): Timers {
  const t = useContext(Ctx);
  if (!t) throw new Error("useTimers вне TimersProvider");
  return t;
}
