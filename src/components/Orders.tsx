import { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { config } from "../config";
import { recipeMap } from "../data";
import { ANSWERS, answerLink, answerOf, answerOrder, onOrdersChange, orderStatus, readOrders, type AnswerId } from "../lib/orders";
import { todayKey } from "../lib/format";
import { shareOrCopy } from "../lib/share";
import { useStore } from "../hooks/useStore";
import type { Recipe } from "../types";

/**
 * Плашка над рецептом:
 * у него (ссылка ?order=1) — «Анюта хочет это блюдо» и кнопки ответа;
 * у неё (ссылка ?answer=…) — ответ записывается в заказ; иначе — статус её заказа, если он есть.
 */
export function OrderPanel({ recipe }: { recipe: Recipe }) {
  const [params] = useSearchParams();
  const { journal, showToast } = useStore();
  const incoming = answerOf(params.get("answer"));
  const [orders, setOrders] = useState(readOrders);
  useEffect(() => onOrdersChange(() => setOrders(readOrders())), []);

  const sentParam = params.get("sent") ?? "";
  useEffect(() => {
    if (incoming && answerOrder(recipe.id, incoming.id, sentParam)) showToast("Ответ записан 🤍");
  }, [incoming, recipe.id, sentParam, showToast]);

  const orderParam = params.get("order");
  const own = orders.find((o) => o.id === recipe.id);
  // Её же ссылка из чата: на её телефоне этот заказ есть — кнопки ответа ей не нужны.
  if (orderParam && !(own && (own.sent === orderParam || orderParam === "1"))) {
    const sent = orderParam === "1" ? todayKey() : orderParam;
    const reply = (answer: AnswerId) => {
      const a = answerOf(answer)!;
      const text = `${a.label} — «${recipe.title}»\n${answerLink(recipe.id, answer, sent)}`;
      shareOrCopy({ text }, text, () => showToast("Ответ скопирован — отправь его в чат"));
    };
    return (
      <section className="order order--incoming" aria-label="Заказ">
        <p className="order__title">{config.herName} хочет это блюдо 🥺</p>
        <div className="order__answers">
          {ANSWERS.map((a) => (
            <button key={a.id} type="button" className={`btn ${a.id === "today" ? "btn--accent" : "btn--ghost"}`} onClick={() => reply(a.id)}>
              {a.label}
            </button>
          ))}
        </div>
      </section>
    );
  }

  if (!own) return null;
  const status = orderStatus(own, journal[recipe.id]?.cooked);
  return <p className={`order order--status ${status === "Заказ выполнен 🤍" ? "is-done" : ""}`}>{status}</p>;
}

/** «Мои заказы» в «Избранном»: что она просила за 2 недели и что ответили. */
export function OrdersList() {
  const { journal } = useStore();
  const location = useLocation();
  const [all, setAll] = useState(readOrders);
  useEffect(() => onOrdersChange(() => setAll(readOrders())), []);
  const orders = all
    .filter((o) => recipeMap[o.id])
    .sort((x, y) => (y.answered ?? y.sent).localeCompare(x.answered ?? x.sent));
  if (!orders.length) return null;
  return (
    <section className="orders" aria-labelledby="orders-title">
      <h2 id="orders-title" className="orders__title">
        Мои заказы
      </h2>
      <ul className="orders__list">
        {orders.map((o) => {
          const status = orderStatus(o, journal[o.id]?.cooked).replace(/^Заказ /, "");
          return (
            <li key={o.id} className="orders__item">
              <Link to={`/recipe/${o.id}`} state={{ background: location }}>
                {recipeMap[o.id].title}
              </Link>
              <span className="orders__status">{status}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
