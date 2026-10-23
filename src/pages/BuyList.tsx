import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { config } from "../config";
import { ingredientMap } from "../data";
import { formatAmount, plural, todayKey } from "../lib/format";
import { groupByAisle } from "../lib/aisles";
import { parseBuy } from "../lib/buyLink";
import { readChecks, saveChecks } from "../lib/together";
import { shareOrCopy } from "../lib/share";
import { useStore } from "../hooks/useStore";

const CHECKS = "pp.buyChecks";

/** Его список покупок по ссылке от Анюты. Каждая ссылка — своя страница с чистыми галочками. */
export function BuyList() {
  const [params] = useSearchParams();
  const linkKey = `buy?${params.toString()}`;
  return <BuyListView key={linkKey} params={params} linkKey={linkKey} />;
}

function BuyListView({ params, linkKey }: { params: URLSearchParams; linkKey: string }) {
  const { showToast } = useStore();
  const { lines, extras, unknown } = parseBuy(params);
  const empty = !lines.length && !extras.length && !unknown;
  const [checked, setChecked] = useState<Set<string>>(() => new Set(readChecks<string>(linkKey, todayKey(), CHECKS)));
  const named = lines.map((l) => ({ ...l, name: ingredientMap[l.id].name }));
  const left = named.filter((l) => !checked.has(l.id)).length;

  const toggle = (id: string) => {
    const next = new Set(checked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setChecked(next);
    saveChecks(linkKey, todayKey(), [...next], CHECKS);
  };
  const done = () => {
    const text = "Всё купил! ✅ Можно готовить, мой шеф 🤍";
    shareOrCopy({ text }, text, () => showToast("Сообщение скопировано — отправь его в чат"));
  };

  return (
    <main className="wrap shopping">
      <header className="page-head">
        <p className="page-sub">Список от {config.herNameGenitive} 🛒</p>
        <h1 className="page-title">Купить</h1>
        <p className="page-sub">
          {empty ? "В ссылке нет продуктов — попроси прислать ещё раз." : named.length ? (left ? `Осталось ${left} из ${named.length}` : "Всё в корзине") : ""}
        </p>
      </header>
      {unknown > 0 && (
        <p className="buy__warn" role="alert">
          {unknown} {plural(unknown, ["продукт не открылся", "продукта не открылись", "продуктов не открылись"])}: на этом телефоне старая версия сайта. Закрой
          и открой сайт заново или попроси список текстом.
        </p>
      )}

      {groupByAisle(named).map((g) => (
        <div key={g.aisle} className="shopping__aisle">
          <h3 className="shopping__aisle-title">{g.aisle}</h3>
          <ul className="ingredients">
            {g.lines.map((l) => (
              <li key={l.id}>
                <label className={checked.has(l.id) ? "is-done" : ""}>
                  <input type="checkbox" checked={checked.has(l.id)} onChange={() => toggle(l.id)} />
                  <span className="ingredients__name">{l.name}</span>
                  <span className="ingredients__amount">{formatAmount(ingredientMap[l.id], l.grams)}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {extras.length > 0 && (
        <p className="shopping__extras">
          <b>Ещё понадобится:</b> {extras.join(", ")}
        </p>
      )}
      {!empty && (
        <button type="button" className="btn btn--accent buy__done" onClick={done}>
          Всё купил ✅
        </button>
      )}
    </main>
  );
}
