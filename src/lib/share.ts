/**
 * Поделиться через системное меню; если его нет или оно сломано — скопировать текст.
 * Закрытое пользователем меню (AbortError) — не ошибка, тогда ничего не делаем.
 * true — отправлено или скопировано.
 */
export async function shareOrCopy(data: ShareData, copyText: string, onCopied: () => void): Promise<boolean> {
  if (navigator.share) {
    try {
      await navigator.share(data);
      return true;
    } catch (e) {
      if ((e as DOMException)?.name === "AbortError") return false;
      // NotAllowedError и «не поддерживается» во встроенных браузерах: падаем в копирование
    }
  }
  try {
    await navigator.clipboard.writeText(copyText);
    onCopied();
    return true;
  } catch {
    /* буфер обмена недоступен: показать нечего */
    return false;
  }
}
