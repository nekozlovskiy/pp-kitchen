---
name: ship
description: Выложить изменения ПП-кухни — тесты, сборка, коммит, пуш в main и проверка, что деплой GitHub Pages прошёл и сайт отдаёт новую версию
disable-model-invocation: true
argument-hint: "[сообщение коммита]"
---

# Выкладка

1. `npm test` и `npm run build` (сборка включает `tsc -b`). Красное — остановиться и показать ошибку.
2. `git status` и `git diff --stat`: в коммит идут только файлы этой задачи. Никаких временных файлов (`.playwright-mcp/`, скриншоты, `dist/`).
3. Коммит на русском в стиле истории (`git log --oneline -5`): что изменилось для Анюты, а не как. Если это партия рецептов — убедиться, что пользователь её одобрил.
4. `git push origin main`.
5. Дождаться деплоя: `gh run watch $(gh run list --workflow "Deploy to GitHub Pages" --limit 1 --json databaseId -q '.[0].databaseId') --exit-status`.
6. Проверить живой сайт: `curl -s https://nekozlovskiy.github.io/pp-kitchen/ | grep -o 'content="[^"]*ПП-рецепт[^"]*"'` — число рецептов совпадает с README. Для правок интерфейса — открыть сайт в Playwright на ширине 390 px и посмотреть изменённый экран.
7. Коротко отчитаться: коммит, что увидит Анюта, напоминание, что у неё может понадобиться обновить страницу (service worker).
