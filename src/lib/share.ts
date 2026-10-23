/**
 * Поделиться через системное меню; если его нет или оно сломано — скопировать текст.
 * Закрытое пользователем меню (AbortError) — не ошибка, тогда ничего не делаем.
 */
export async function shareOrCopy(data: ShareData, copyText: string, onCopied: () => void): Promise<void> {
  if (navigator.share) {
    try {
      await navigator.share(data);
      return;
    } catch (e) {
      if ((e as DOMException)?.name === "AbortError") return;
      // NotAllowedError и «не поддерживается» во встроенных браузерах: падаем в копирование
    }
  }
  try {
    await navigator.clipboard.writeText(copyText);
    onCopied();
  } catch {
    /* буфер обмена недоступен: показать нечего */
  }
}
