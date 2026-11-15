# Kitchen Keepsakes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Добавить четыре согласованные личные функции.
**Architecture:** Новые чистые функции проверяют сохранённые данные, вычисляют штампы и подбирают ужин. Общий React store хранит отметки и воспоминания; страницы используют существующие компоненты и фото-хранилище.
**Tech Stack:** React, TypeScript, Vite, Vitest, IndexedDB.
**Spec:** docs/superpowers/specs/2026-11-16-kitchen-keepsakes-design.md

## Global Constraints

- Без новых зависимостей, бэкенда и изменений состава/КБЖУ.
- Данные на устройстве; экспорт переносит текст, но не фото.
- Светлая/тёмная тема и ширина телефона 390 px.

## Review Focus

- Повреждённые данные и неизвестные id не ломают экран.
- Отметки двух людей независимы от старого избранного.
- Изменение фильтров сюрприза убирает прежний скрытый/раскрытый выбор.
- Фото разных воспоминаний и старого дневника независимы.
- Перенос не оставляет ссылок на отсутствующие фотографии.

### Task 1: Данные и любимые
**Files:** src/lib/keepsakes.ts, src/lib/keepsakes.test.ts, src/hooks/useStore.tsx, src/pages/Favorites.tsx, src/components/RecipeJournal.tsx, src/lib/transfer.ts.
**Interfaces:** CoupleLikes = Record<string, { anya: boolean; danya: boolean }>; Memory = { id, recipeId, date, caption, photo? }; cleanCoupleLikes(raw), cleanMemories(raw).
- [x] Проверить санитизацию неизвестных id, неверных дат, дублей записей и некорректных флагов.
- [x] Добавить независимые отметки и фильтры, включить новые ключи в перенос без фото.
- [x] Выполнить npm test и npm run typecheck.

### Task 2: Паспорт и сюрприз
**Files:** src/lib/passport.ts, src/lib/surprise.ts и их тесты; src/pages/Passport.tsx, src/pages/Surprise.tsx, src/pages/Kitchen.tsx, src/pages/Home.tsx, src/App.tsx.
**Interfaces:** passportStamps(journal, list): Stamp[]; dinnerPool(list, exclude, dislikes, maxMinutes, products): Recipe[].
- [x] Проверить уникальные приготовленные блюда, старую историю, пустую выборку, исключения и лимит времени.
- [x] Добавить штампы, скрытые подсказки и раскрытие, переходы и заголовки страниц.
- [x] Выполнить целевые тесты и typecheck.

### Task 3: Альбом и проверка
**Files:** src/pages/Memories.tsx, src/styles/keepsakes.css, src/main.tsx, README.md.
**Interfaces:** store.memories, saveMemory(memory), removeMemory(id); существующие savePhoto/loadPhoto/deletePhoto с отдельным ключом записи.
- [x] Добавить форму создания/редактирования, отдельные фото, удаление с подтверждением.
- [x] Проверить экспорт без фото и повторное открытие данных.
- [x] Выполнить npm test, npm run typecheck, npm run build.
- [x] Проверить собранный сайт через check-ui и провести feature-reviewer по рабочей копии.

Реализация в текущем чате; пуш и деплой не входят в этот этап.

## Результат проверки

- `npm test`: 112/112, 9 файлов. `npm run typecheck`: успешно. `npm run build`: успешно (имеющиеся предупреждения Vite о размере чанка и deprecated advancedChunks).
- Feature-reviewer проверил рабочую копию: сценарий восстановления удалённого воспоминания из редактора исправлен скрытием действий карточек на время редактирования. Проверено в браузере.
- Сборка проверена на 390 × 844, светлая и тёмная темы: паспорт, избранное, сюрприз, альбом и переходы из кухни. Исправлено переполнение длинного заголовка альбома. Проверена видимость кнопки раскрытия над нижней навигацией.
- Через интерфейс проверены отметки обоих людей, смена фильтра после раскрытия, создание/редактирование/отмена/удаление записи, два независимых фото одного блюда, перезагрузка и удаление фото. Тестовые записи удалены.
- Новые ключи включены в экспорт; указатели на локальные фото исключаются при экспорте и импорте.
- Публикация не выполнялась.
