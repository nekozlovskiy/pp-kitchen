import { Component, type ReactNode } from "react";

/** Сбрасывает офлайн-кэш и перезагружает страницу. Избранное и отметки (localStorage) не трогает. */
async function hardReload() {
  try {
    const regs = (await navigator.serviceWorker?.getRegistrations()) ?? [];
    await Promise.all(regs.map((r) => r.unregister()));
    const keys = (await caches?.keys()) ?? [];
    await Promise.all(keys.map((k) => caches.delete(k)));
  } catch {
    /* без кэша просто перезагрузим */
  }
  location.reload();
}

/** Вместо белого экрана при сбое показывает понятное сообщение и кнопку обновления. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error(error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="wrap empty" role="alert">
        <p className="empty__title">Что-то пошло не так</p>
        <p>Скорее всего, телефон держит старую версию сайта. Избранное и отметки не пропадут.</p>
        <button type="button" className="btn btn--accent" onClick={hardReload}>
          Обновить сайт
        </button>
      </main>
    );
  }
}
