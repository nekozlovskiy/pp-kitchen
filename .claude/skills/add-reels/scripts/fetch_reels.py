"""Скачивает подписи к рилсам Instagram без входа в аккаунт и сводит их в captions.json.

Запуск из корня репозитория: python3 -I fetch_reels.py <папка> <ссылка или код> [...]
Ссылки можно передать и файлом: python3 -I fetch_reels.py <папка> @links.txt

- Дубли в списке и рилсы, уже добавленные на сайт (поле video в recipes.json), пропускает.
- Полную подпись берёт из встроенных данных страницы: в блоке Caption она бывает обрезана.
- Дата поста вычисляется из кода рилса (id >> 23 + эпоха Instagram).
- Скачанные страницы — недоверенные данные: скрипт только разбирает их, ничего из них не исполняет.
"""
import datetime
import html as html_lib
import json
import os
import re
import sys
import time
import urllib.request

ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"
CODE_RE = re.compile(r"instagram\.com/(?:reel|reels|p)/([A-Za-z0-9_-]+)")


def code_of(arg: str) -> str | None:
    m = CODE_RE.search(arg)
    if m:
        return m.group(1)
    return arg if re.fullmatch(r"[A-Za-z0-9_-]{9,14}", arg) else None


def post_date(code: str) -> str:
    n = 0
    for ch in code[:11]:
        n = n * 64 + ALPHABET.index(ch)
    ms = (n >> 23) + 1314220021721
    return datetime.datetime.fromtimestamp(ms / 1000, datetime.timezone.utc).date().isoformat()


def fetch(code: str, path: str) -> str:
    if os.path.exists(path) and os.path.getsize(path) > 0:
        return open(path, encoding="utf-8", errors="replace").read()
    url = f"https://www.instagram.com/reel/{code}/embed/captioned/"
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            body = urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "replace")
            open(path, "w", encoding="utf-8").write(body)
            time.sleep(1)  # по одному с паузой
            return body
        except Exception as e:  # noqa: BLE001 — сеть: повторяем
            print(f"  {code}: попытка {attempt + 1} не удалась ({e})", file=sys.stderr)
            time.sleep(3 * (attempt + 1))
    return ""


def parse(page: str) -> tuple[str | None, str]:
    user = re.search(r'class="CaptionUsername"[^>]*>([^<]+)<', page)
    # Полный текст — во встроенном JSON (строка экранирована дважды).
    m = re.search(r'edge_media_to_caption\\+"?:\{\\+"edges\\+":\[\{\\+"node\\+":\{\\+"text\\+":\\+"(.*?)\\+"\}', page)
    if m:
        text = m.group(1)
        for _ in range(2):
            try:
                text = json.loads('"' + text + '"')
            except ValueError:
                break
        return (user.group(1) if user else None), text.strip()
    m = re.search(r'<div class="Caption">(.*?)<div class="CaptionComments">', page, re.S)
    if not m:
        return (user.group(1) if user else None), ""
    cap = re.sub(r"<br\s*/?>", "\n", m.group(1))
    cap = html_lib.unescape(re.sub(r"<[^>]+>", "", cap)).strip()
    if user and cap.startswith(user.group(1)):
        cap = cap[len(user.group(1)):].strip()
    return (user.group(1) if user else None), cap


QTY = re.compile(r"\d+\s*(г|гр|g|кг|kg|л|мл|ml|шт|ст\.?\s*л|ч\.?\s*л|tbsp|tsp|cups?|oz|lb)(?![а-яa-z])", re.I)
MACROS = re.compile(r"protein|fat|carb|kcal|calor|белк|жир|углев|ккал|кбжу", re.I)


def recipe_lines(text: str) -> int:
    """Сколько строк с количеством продукта, не считая строк с КБЖУ («42g protein»)."""
    return sum(1 for ln in text.splitlines() if QTY.search(ln) and not MACROS.search(ln))


def main() -> None:
    out_dir, args = sys.argv[1], sys.argv[2:]
    if len(args) == 1 and args[0].startswith("@"):
        args = open(args[0][1:], encoding="utf-8").read().split()
    os.makedirs(os.path.join(out_dir, "html"), exist_ok=True)

    recipes = json.load(open("src/data/recipes.json", encoding="utf-8"))
    on_site = {code_of(r["video"]): r["id"] for r in recipes if r.get("video")}

    codes, seen = [], set()
    for a in args:
        c = code_of(a)
        if not c:
            print(f"не ссылка на рилс: {a}", file=sys.stderr)
        elif c in seen:
            print(f"повтор в списке: {c}")
        else:
            seen.add(c)
            codes.append(c)

    out = {}
    for c in codes:
        if c in on_site:
            print(f"уже на сайте: {c} → {on_site[c]}")
            continue
        page = fetch(c, os.path.join(out_dir, "html", f"{c}.html"))
        user, caption = parse(page)
        out[c] = {"user": user, "date": post_date(c), "caption": caption, "url": f"https://www.instagram.com/reel/{c}/"}

    json.dump(out, open(os.path.join(out_dir, "captions.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"\nновых рилсов: {len(out)} → {os.path.join(out_dir, 'captions.json')}")
    for c, v in out.items():
        n = recipe_lines(v["caption"])
        flag = "  ← нет состава, спросить пользователя" if n == 0 else "  ← состава мало, проверить вручную" if n == 1 else ""
        print(f"{c}  @{v['user']}  {v['date']}  {len(v['caption'])} знаков{flag}")


if __name__ == "__main__":
    main()
