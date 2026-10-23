---
name: check-ui
description: Use when a change to ПП-кухня screens, styles or components needs to be seen working on a phone-width screen before shipping, or when the user reports something looks wrong on the site
argument-hint: "[адрес страницы, например /swipe или /recipe/<id>]"
---

# Проверка экрана на телефоне

Сборка, превью и Playwright (плагин) на 390 × 844. Смотреть **собранный** сайт, не `npm run dev`: так виден тот же service worker, что у Анюты.

## 1. Собрать и поднять превью

```bash
npm run build && (npx vite preview --port 4179 > /dev/null 2>&1 &); sleep 2; curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4179/
```

## 2. Открыть чистую страницу

`browser_resize` 390 × 844, затем `browser_run_code_unsafe` (подставить адрес):

```js
async (page) => {
  await page.goto('http://localhost:4179/');
  // Service worker отдаёт прошлую сборку («Тарелка пуста» на новом адресе) — снимаем его и кэш.
  // pp.cooking — плашка «Готовлю сейчас» от прошлых проверок.
  await page.evaluate(async () => {
    for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();
    for (const k of await caches.keys()) await caches.delete(k);
    localStorage.removeItem('pp.cooking');
  });
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto('http://localhost:4179/#/swipe'); await page.reload(); await page.waitForTimeout(800);
  const nav = await page.locator('.nav').boundingBox();
  const main = await page.getByRole('button', { name: 'Хочу' }).boundingBox(); // главная кнопка экрана
  return {
    errors,
    horizontalScroll: await page.evaluate(() => document.scrollingElement.scrollWidth > innerWidth),
    hiddenByNav: main && nav ? main.y + main.height > nav.y : null, // true — кнопка уходит под нижнее меню
  };
}
```

Нужные состояния (колода, челлендж, отметки) задавать через `localStorage` в том же коде, а не кликами по десятку экранов. Клики — `page.getByRole(...)`.

## 3. Посмотреть

- `browser_take_screenshot` с `filename: ".playwright-mcp/<имя>.png"` (scratchpad запрещён), без `fullPage`: на снимке всей страницы закреплённое меню рисуется посреди. Затем `Read` этого файла — смотреть глазами.
- Проверить: `hiddenByNav` — `false`, нет горизонтальной прокрутки, нет ошибок в консоли, текст не обрезан.
- Тёмная тема: `await page.emulateMedia({ colorScheme: 'dark' })`, снимок ещё раз — контраст и фон карточек.

## 4. Убрать за собой

```bash
pkill -f "vite preview --port 4179"
```

`.playwright-mcp/` в `.gitignore` — не коммитить. Анюте после выкладки может понадобиться закрыть и открыть сайт заново (service worker).
