import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Относительный base + HashRouter: сайт работает на GitHub Pages
// под любым именем репозитория и на любом статическом хостинге.
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        // Рецепты меняются чаще кода, а React — реже всего: отдельные файлы кэшируются независимо,
        // и после добавления рецептов телефон докачивает только данные.
        advancedChunks: {
          groups: [
            { name: "react", test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/ },
            { name: "recipes", test: /src[\\/]data[\\/].*\.json$/ },
          ],
        },
      },
    },
  },
});
