import { useEffect, useState } from "react";

/** Не даёт экрану погаснуть, пока `on` включён. На старых браузерах просто ничего не делает. */
export function useWakeLock(on: boolean) {
  const supported = typeof navigator !== "undefined" && "wakeLock" in navigator;
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!on || !supported) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        lock = await navigator.wakeLock.request("screen");
        if (cancelled) return void lock.release();
        setActive(true);
        lock.addEventListener("release", () => setActive(false));
      } catch {
        setActive(false);
      }
    };
    // Браузер снимает блокировку, когда вкладка уходит в фон: возвращаем её при возвращении.
    const onVisible = () => {
      if (document.visibilityState === "visible") acquire();
    };

    acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      lock?.release().catch(() => {});
      setActive(false);
    };
  }, [on, supported]);

  return { supported, active };
}
