"""Разбор скачанных страниц Gastronom.ru.

Использование: python3 -I parse_gastronom.py <папка из fetch.sh>
Печатает статьи (для sources.json) и рецепты, полные данные пишет в <папка>/all.json.
"""
import glob
import html
import json
import os
import re
import sys

LD = re.compile(r'<script type="application/ld\+json">(.*?)</script>', re.S)
# Граммы — во встроенных данных страницы: legacyName («2 ломтика») и quantityInGramms.
INGS = re.compile(r'"legacyName":"(.*?)","displayUnit".*?"quantityInGramms":(null|"[\d.]+")')


def ld_items(page):
    for block in LD.findall(page):
        try:
            data = json.loads(block)
        except json.JSONDecodeError:
            continue
        for x in data if isinstance(data, list) else [data]:
            yield x


def first(value):
    return value[0] if isinstance(value, list) and value else value


def main(folder):
    print("== Статьи (ключ для sources.json: автор и дата отсюда)")
    for f in sorted(glob.glob(os.path.join(folder, "a*.html"))):
        page = open(f, encoding="utf-8").read()
        art = next((x for x in ld_items(page) if x.get("@type") in ("Article", "NewsArticle")), None)
        if not art:
            print(os.path.basename(f), "нет JSON-LD Article")
            continue
        author = first(art.get("author")) or {}
        print(os.path.basename(f)[1:-5], "|", art.get("headline"), "|", author.get("name"), "|", (art.get("datePublished") or "")[:10])

    out = {}
    for f in sorted(glob.glob(os.path.join(folder, "r", "*.html"))):
        page = open(f, encoding="utf-8").read()
        rid = os.path.basename(f)[:-5]
        rec = next((x for x in ld_items(page) if x.get("@type") == "Recipe"), None)
        if not rec:
            print(rid, "нет JSON-LD Recipe")
            continue
        author = first(rec.get("author")) or {}
        seen = []
        for x in INGS.findall(page):
            if x not in seen:
                seen.append(x)
        steps = [s.get("text") for s in rec.get("recipeInstructions", []) if isinstance(s, dict)]
        out[rid] = dict(
            title=rec.get("name"),
            author=author.get("name"),
            yield_=rec.get("recipeYield"),
            time=rec.get("totalTime"),
            cat=rec.get("recipeCategory"),
            ings=[(html.unescape(n), q.strip('"')) for n, q in seen],
            steps=steps,
        )
    json.dump(out, open(os.path.join(folder, "all.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    print("\n== Рецепты (брать только автора gastronom)")
    for rid, r in out.items():
        no_grams = sum(1 for _, q in r["ings"] if q == "null")
        stub = any(re.fullmatch(r"\s*Шаг\s*\d+\.?\s*", s or "", re.I) for s in r["steps"])
        flags = (" · без граммов: %d" % no_grams if no_grams else "") + (" · шаги-заглушки" if stub else "")
        print(rid, r["author"], "|", r["title"], "|", r["yield_"], flags)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else ".")
