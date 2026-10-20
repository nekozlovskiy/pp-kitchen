import { useEffect, useState } from "react";
import { readJSON, writeJSON } from "../lib/storage";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const standalone = () =>
  window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

// Браузер присылает событие установки один раз и рано — ловим его при загрузке модуля, а не только на главной.
let deferred: InstallEvent | null = null;
const listeners = new Set<(e: InstallEvent) => void>();
if (typeof window !== "undefined")
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallEvent;
    listeners.forEach((f) => f(deferred!));
  });

const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

/**
 * Одноразовая подсказка, как поставить сайт иконкой на телефон. На iPhone — словами (Safari не даёт кнопку),
 * на Android — кнопкой «Установить». Уже установленным и закрывшим подсказку не показывается.
 */
export function InstallHint() {
  const [hidden, setHidden] = useState(() => readJSON<boolean>("pp.installHint", false) || standalone());
  const [prompt, setPrompt] = useState<InstallEvent | null>(deferred);

  useEffect(() => {
    listeners.add(setPrompt);
    return () => {
      listeners.delete(setPrompt);
    };
  }, []);

  const close = () => {
    writeJSON("pp.installHint", true);
    setHidden(true);
  };

  if (hidden || (!prompt && !isIOS())) return null;

  return (
    <aside className="install-hint" aria-label="Как поставить ПП-кухню на экран телефона">
      <p className="install-hint__title">ПП-кухня на экране «Домой»</p>
      {prompt ? (
        <p>Поставьте сайт иконкой на телефон — он будет открываться как приложение, даже без интернета.</p>
      ) : (
        <p>Нажмите в браузере «Поделиться» и выберите «На экран „Домой“» — сайт будет открываться как приложение, даже без интернета.</p>
      )}
      <div className="install-hint__actions">
        {prompt && (
          <button
            type="button"
            className="btn btn--accent"
            onClick={async () => {
              // Окно установки можно показать только один раз; что бы ни случилось — подсказку закрываем.
              try {
                await prompt.prompt();
                await prompt.userChoice;
              } catch {
                /* браузер отказал */
              } finally {
                deferred = null;
                close();
              }
            }}
          >
            Установить
          </button>
        )}
        <button type="button" className="btn btn--ghost" onClick={close}>
          {prompt ? "Не сейчас" : "Понятно"}
        </button>
      </div>
    </aside>
  );
}
