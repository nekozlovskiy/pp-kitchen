import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { hasPendingImport, retryPendingImport } from "../lib/transfer";
import { hasUnsavedChanges, retryStorageWrites, subscribeStorage } from "../lib/storage";

/** Постоянная подсказка: обычный тост исчез бы раньше, чем удастся сохранить копию. */
export function StorageNotice() {
  const [mount, setMount] = useState<HTMLElement | null>(null);
  useEffect(() => {
    // Внутри активного окна уведомление доступно и скринридеру, и его ловушке Tab.
    const update = () => setMount([...document.querySelectorAll<HTMLElement>('[role="dialog"]')].at(-1) ?? document.body);
    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true });
    update();
    return () => observer.disconnect();
  }, []);
  const unsaved = useSyncExternalStore(subscribeStorage, hasUnsavedChanges, () => false);
  const importing = useSyncExternalStore(subscribeStorage, hasPendingImport, () => false);
  if (!unsaved && !importing) return null;
  return createPortal(
    <aside className="storage-notice" role="alert" aria-label="Не удалось сохранить изменения">
      <p><b>{importing ? "Перенос ещё не завершён." : "Изменения пока не сохранены."}</b> Не закрывай и не обновляй страницу: сохрани копию или попробуй ещё раз.</p>
      <div>
        <button type="button" className="btn btn--accent" onClick={() => {
          if (importing) { if (retryPendingImport()) window.location.reload(); }
          else retryStorageWrites();
        }}>Попробовать ещё раз</button>
        <Link className="btn btn--ghost" to="/transfer">Сохранить копию</Link>
      </div>
    </aside>, mount ?? document.body,
  );
}
