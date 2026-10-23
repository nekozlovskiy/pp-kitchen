import { config } from "../config";
import { shareOrCopy } from "./share";

/** Текст просьбы «Приготовь мне»: случайный шаблон из config.cookForMe с названием блюда. */
export function cookForMeText(title: string, random: () => number = Math.random): string {
  const list = config.cookForMe;
  const template = list[Math.floor(random() * list.length)] ?? "Хочу на ужин: {блюдо}";
  return template.replace("{блюдо}", `«${title}»`);
}

/** Отправить просьбу через системное меню «Поделиться»; без него — скопировать текст. */
export async function askToCook(recipe: { id: string; title: string }, onCopied: () => void): Promise<void> {
  const url = `${location.origin}${location.pathname}#/recipe/${recipe.id}`;
  // Ссылка внутри текста: при отдельном поле url Telegram и WhatsApp отбрасывают text и присылают только ссылку.
  const text = `${cookForMeText(recipe.title)}\n${url}`;
  await shareOrCopy({ text }, text, onCopied);
}
