import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

// Открытые листы по порядку: Esc и Tab обрабатывает только верхний (конверт поверх рецепта).
const openSheets: symbol[] = [];

/** Нижний лист на телефоне, окно по центру на компьютере. */
export function Sheet({
  label,
  onClose,
  children,
  closeLabel = "Закрыть рецепт",
}: {
  label: string;
  onClose: () => void;
  children: ReactNode;
  closeLabel?: string;
}) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();

    const me = Symbol(label);
    openSheets.push(me);
    const onKey = (e: KeyboardEvent) => {
      if (openSheets.at(-1) !== me) return;
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && panel.current) {
        const items = panel.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, select, [tabindex]:not([tabindex="-1"])',
        );
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      openSheets.splice(openSheets.indexOf(me), 1);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, [onClose, label]);

  return (
    <div className="sheet" role="presentation">
      <div className="sheet__backdrop" onClick={onClose} />
      <div className="sheet__panel" role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} ref={panel}>
        <span className="sheet__grip" aria-hidden="true" />
        <button type="button" className="sheet__close" onClick={onClose} aria-label={closeLabel}>
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </button>
        {children}
      </div>
    </div>
  );
}
