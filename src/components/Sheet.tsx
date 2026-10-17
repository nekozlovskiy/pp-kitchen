import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

/** Нижний лист на телефоне, окно по центру на компьютере. */
export function Sheet({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();

    const onKey = (e: KeyboardEvent) => {
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
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="sheet" role="presentation">
      <div className="sheet__backdrop" onClick={onClose} />
      <div className="sheet__panel" role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} ref={panel}>
        <span className="sheet__grip" aria-hidden="true" />
        <button type="button" className="sheet__close" onClick={onClose} aria-label="Закрыть рецепт">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </button>
        {children}
      </div>
    </div>
  );
}
