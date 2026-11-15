import { afterEach, expect, it, vi } from "vitest";
import { deletePhoto } from "./photos";

afterEach(() => vi.unstubAllGlobals());

it("дожидается фиксации фото-транзакции и сообщает об отмене после успешного запроса", async () => {
  let opened: { onsuccess?: () => void; result?: unknown } = {};
  const request: { result: undefined; onsuccess?: () => void } = { result: undefined };
  const transaction: { objectStore: () => unknown; oncomplete?: () => void; onabort?: () => void } = {
    objectStore: () => ({ delete: () => request }),
  };
  const close = vi.fn();
  vi.stubGlobal("indexedDB", { open: () => { opened = { result: { transaction: () => transaction, close } }; return opened; } });
  let resolved = false;
  const deleting = deletePhoto("memory:evening").then((ok) => { resolved = true; return ok; });
  opened.onsuccess!();
  await Promise.resolve();
  request.onsuccess!();
  await Promise.resolve();
  expect(resolved).toBe(false);
  transaction.onabort!();
  expect(await deleting).toBe(false);
  expect(close).toHaveBeenCalledOnce();
});
