import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { App } from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { StoreProvider } from "./hooks/useStore";
import { TimersProvider } from "./hooks/useTimers";
import "./styles/tokens.css";
import "./styles/global.css";
import "./styles/kitchen.css";

// Офлайн-режим и установка на экран телефона (только в собранной версии)
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      /* без service worker сайт просто работает онлайн */
    });
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <HashRouter>
        <StoreProvider>
          <TimersProvider>
            <App />
          </TimersProvider>
        </StoreProvider>
      </HashRouter>
    </ErrorBoundary>
  </StrictMode>,
);
