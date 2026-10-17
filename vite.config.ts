import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Относительный base + HashRouter: сайт работает на GitHub Pages
// под любым именем репозитория и на любом статическом хостинге.
export default defineConfig({
  base: "./",
  plugins: [react()],
});
