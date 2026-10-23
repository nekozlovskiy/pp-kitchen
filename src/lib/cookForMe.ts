import { config } from "../config";

/** Текст просьбы «Приготовь мне»: случайный шаблон из config.cookForMe с названием блюда. */
export function cookForMeText(title: string, random: () => number = Math.random): string {
  const list = config.cookForMe;
  const template = list[Math.floor(random() * list.length)] ?? "Хочу на ужин: {блюдо}";
  return template.replace("{блюдо}", `«${title}»`);
}
