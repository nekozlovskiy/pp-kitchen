import { useStore } from "../hooks/useStore";

export function Toast() {
  const { toast } = useStore();
  return (
    <div className="toast-region" role="status" aria-live="polite">
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
