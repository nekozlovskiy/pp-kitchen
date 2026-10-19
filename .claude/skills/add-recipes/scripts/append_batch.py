"""Дописывает партию рецептов в src/data и обновляет число рецептов в README и index.html.

Запуск из корня репозитория: python3 append_batch.py <batch.json>

Формат batch.json:
{
  "new_ingredients": [{"id": "pearl_barley", "name": "Перловая крупа (сухая)",
                       "per100": {"kcal": 320, "p": 9.3, "f": 1.1, "c": 66.9}, "unit": "ml"?}],
  "recipes": [{"id": "gs-…", "category": "dinner", "title": "…", "description": "…",
               "timeMinutes": 30, "timeNote"?: "…", "level": "Легко", "servings": 2,
               "portionLabel"?: "…", "art": "pot", "source": "gs_kashi",
               "ingredients": [["oats", 150], …], "extras"?: [["Соль", "щепотка"], …],
               "steps": ["…"], "tip"?: "…"}],
  "sources": {"gs_kashi": {"site": "Гастроном.ру", "title": "…", "author": "…",
                           "date": "2025-09-03", "url": "https://…"}}
}
"""
import json
import re
import sys

P = "src/data/"
ORDER = ["id", "category", "title", "description", "timeMinutes", "timeNote", "level", "servings",
         "portionLabel", "art", "source", "ingredients", "extras", "steps", "tip", "video"]


def plural(n, one, few, many):
    if n % 10 == 1 and n % 100 != 11:
        return one
    if 2 <= n % 10 <= 4 and not 12 <= n % 100 <= 14:
        return few
    return many


def main(path):
    batch = json.load(open(path, encoding="utf-8"))
    recipes = json.load(open(P + "recipes.json", encoding="utf-8"))
    ingredients = json.load(open(P + "ingredients.json", encoding="utf-8"))
    sources = json.load(open(P + "sources.json", encoding="utf-8"))

    new_ing = batch.get("new_ingredients", [])
    new_src = batch.get("sources", {})
    ing_ids = {i["id"] for i in ingredients}
    for i in new_ing:
        assert i["id"] not in ing_ids, f"продукт уже есть: {i['id']}"
        ing_ids.add(i["id"])
    for k in new_src:
        assert k not in sources, f"источник уже есть: {k}"

    ids = {r["id"] for r in recipes}
    titles = {r["title"].lower() for r in recipes}
    for r in batch["recipes"]:
        assert r["id"] not in ids and r["title"].lower() not in titles, f"дубль: {r['id']}"
        assert r["source"] in sources or r["source"] in new_src, f"нет источника {r['source']}"
        r["ingredients"] = [{"id": i, "grams": g} for i, g in r["ingredients"]]
        if "extras" in r:
            r["extras"] = [{"name": n, "amount": a} for n, a in r["extras"]]
        for x in r["ingredients"]:
            assert x["id"] in ing_ids, f"{r['id']}: нет продукта {x['id']}"
        ids.add(r["id"])
        titles.add(r["title"].lower())
        recipes.append({k: r[k] for k in ORDER if k in r})

    open(P + "recipes.json", "w", encoding="utf-8").write(json.dumps(recipes, ensure_ascii=False, indent=2) + "\n")

    # ingredients.json и sources.json — по строке на запись, как в репозитории
    txt = open(P + "ingredients.json", encoding="utf-8").read().rstrip().rstrip("]").rstrip()
    for i in new_ing:
        m = ", ".join(f'"{k}": {v}' for k, v in i["per100"].items())
        unit = f', "unit": "{i["unit"]}"' if i.get("unit") else ""
        txt += f',\n  {{ "id": "{i["id"]}", "name": "{i["name"]}", "per100": {{ {m} }}{unit} }}'
    open(P + "ingredients.json", "w", encoding="utf-8").write(txt + "\n]\n")

    txt = open(P + "sources.json", encoding="utf-8").read().rstrip().rstrip("}").rstrip()
    for k, v in new_src.items():
        txt += f',\n  "{k}": {{ ' + ", ".join(f'"{a}": {json.dumps(b, ensure_ascii=False)}' for a, b in v.items()) + " }"
    open(P + "sources.json", "w", encoding="utf-8").write(txt + "\n}\n")

    n = len(recipes)
    readme = open("README.md", encoding="utf-8").read()
    readme = re.sub(r"\d+ блюд[оа]?\b", f"{n} {plural(n, 'блюдо', 'блюда', 'блюд')}", readme, count=1)
    open("README.md", "w", encoding="utf-8").write(readme)
    index = open("index.html", encoding="utf-8").read()
    index = re.sub(r"\d+ блюд[оа]?(?= с калориями)", f"{n} {plural(n, 'блюдо', 'блюда', 'блюд')}", index)
    index = re.sub(r"\d+ ПП-рецепт(?:а|ов)?\b", f"{n} ПП-{plural(n, 'рецепт', 'рецепта', 'рецептов')}", index)
    open("index.html", "w", encoding="utf-8").write(index)

    print(f"добавлено {len(batch['recipes'])}, всего {n}; новых продуктов {len(new_ing)}, источников {len(new_src)}")


if __name__ == "__main__":
    main(sys.argv[1])
