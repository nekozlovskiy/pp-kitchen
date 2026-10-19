import { useEffect, useRef, useState } from "react";

function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}

/**
 * Видео из Instagram через официальный плеер. Плеер грузится только по нажатию:
 * так страница рецепта открывается быстро и не тянет Instagram без нужды.
 */
export function ReelEmbed({ url, title }: { url: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [height, setHeight] = useState<number>();
  const frame = useRef<HTMLIFrameElement>(null);
  const online = useOnline();
  const embed = url.replace(/\/?$/, "/") + "embed/";

  // Плеер сам сообщает свою высоту (сообщение MEASURE) — подгоняем рамку, чтобы не было пустоты и обрезки.
  useEffect(() => {
    if (!open) return;
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== "https://www.instagram.com" || e.source !== frame.current?.contentWindow) return;
      try {
        const msg = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        const h = msg?.type === "MEASURE" ? Number(msg.details?.height) : NaN;
        if (h > 200 && h < 2000) setHeight(Math.ceil(h));
      } catch {
        // чужое сообщение — пропускаем
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [open]);

  return (
    <section className="reel" aria-label="Видео рецепта">
      {open && online ? (
        <iframe
          ref={frame}
          className="reel__frame"
          style={height ? { height } : undefined}
          src={embed}
          title={`Видео: ${title}`}
          allow="autoplay; encrypted-media; picture-in-picture; web-share"
          allowFullScreen
        />
      ) : (
        <button type="button" className="reel__start" onClick={() => setOpen(true)} disabled={!online}>
          <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
            <path d="M8 5.5v13l11-6.5-11-6.5Z" />
          </svg>
          <span>
            <b>Смотреть видео</b>
            <small>{online ? "Откроется плеер Instagram" : "Видео доступно, когда есть интернет"}</small>
          </span>
        </button>
      )}
    </section>
  );
}
