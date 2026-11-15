import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

beforeEach(() => { vi.resetModules(); });
afterEach(() => { vi.unstubAllGlobals(); });

function storage() {
  const values = new Map<string, string>();
  const getItem = vi.fn((key: string) => values.get(key) ?? null);
  const setItem = vi.fn((key: string, value: string) => { values.set(key, value); });
  vi.stubGlobal("window", { localStorage: { getItem, setItem, removeItem: vi.fn((key: string) => { values.delete(key); }) } });
  return { values, getItem, setItem };
}

describe("ошибки сохранения", () => {
  it("переносит любимые и воспоминания без ссылок на локальные фото", async () => {
    storage();
    const { writeJSON, readJSON } = await import("./storage");
    const { exportBundle, importBundle } = await import("./transfer");
    const memory = { id: "evening", recipeId: "banana-syrniki", date: "2026-11-16", caption: "Наш вечер" };
    const likes = { "banana-syrniki": { anya: true, danya: true } };
    writeJSON("pp.memories", [{ ...memory, photo: 123 }]);
    writeJSON("pp.coupleLikes", likes);
    const bundle = exportBundle();
    expect(bundle.data["pp.memories"]).toEqual([memory]);
    expect(bundle.data["pp.coupleLikes"]).toEqual(likes);
    expect(readJSON("pp.memories", [])).toEqual([{ ...memory, photo: 123 }]);
    importBundle({ v: 1, at: "2026-11-16", data: { "pp.memories": [{ ...memory, photo: 456 }] } });
    expect(readJSON("pp.memories", [])).toEqual([memory]);
  });
  it("сохраняет последнее изменение в памяти и делает его доступным для экспорта", async () => {
    const mock = storage();
    const { writeJSON, readJSON, hasUnsavedChanges } = await import("./storage");
    mock.setItem.mockImplementation(() => { throw new Error("quota"); });
    writeJSON("pp.journal", { dish: { note: "Соли меньше" } });
    writeJSON("pp.journal", { dish: { note: "Соли меньше, запечь дольше" } });
    expect(hasUnsavedChanges()).toBe(true);
    expect(readJSON("pp.journal", {})).toEqual({ dish: { note: "Соли меньше, запечь дольше" } });
  });

  it("не скрывает проблему при успешной записи другого ключа и умеет повторить сохранение", async () => {
    const mock = storage();
    const { writeJSON, retryStorageWrites, hasUnsavedChanges } = await import("./storage");
    mock.setItem.mockImplementation((key, value) => {
      if (key === "pp.journal") throw new Error("quota");
      mock.values.set(key, value);
    });
    writeJSON("pp.journal", { dish: { note: "Важно" } });
    writeJSON("pp.favorites", ["dish"]);
    expect(hasUnsavedChanges()).toBe(true);
    expect(retryStorageWrites()).toBe(false);
    mock.setItem.mockImplementation((key, value) => { mock.values.set(key, value); });
    expect(retryStorageWrites()).toBe(true);
    expect(hasUnsavedChanges()).toBe(false);
    expect(JSON.parse(mock.values.get("pp.journal")!)).toEqual({ dish: { note: "Важно" } });
  });

  it("выгружает несохранённое избранное в резервную копию", async () => {
    const mock = storage();
    const { writeJSON } = await import("./storage");
    const { exportBundle } = await import("./transfer");
    mock.setItem.mockImplementation(() => { throw new Error("unavailable"); });
    writeJSON("pp.favorites", ["banana-syrniki"]);
    expect(exportBundle().data["pp.favorites"]).toEqual(["banana-syrniki"]);
  });
});

describe("повтор сохранения и удаления", () => {
  it("не восстанавливает завершённую готовку из временной копии", async () => {
    const mock = storage();
    const { writeJSON, readJSON, removeJSON, retryStorageWrites } = await import("./storage");
    mock.setItem.mockImplementation(() => { throw new Error("quota"); });
    writeJSON("pp.cooking", { id: "dish" });
    removeJSON("pp.cooking");
    expect(readJSON("pp.cooking", null)).toBeNull();
    mock.setItem.mockImplementation((key, value) => { mock.values.set(key, value); });
    retryStorageWrites();
    expect(mock.values.has("pp.cooking")).toBe(false);
  });
  it("сохраняет удаление в памяти, даже когда removeItem недоступен", async () => {
    const mock = storage();
    mock.values.set("pp.cooking", JSON.stringify({ id: "old" }));
    vi.mocked(window.localStorage.removeItem).mockImplementationOnce(() => { throw new Error("unavailable"); });
    const { readJSON, removeJSON, retryStorageWrites } = await import("./storage");
    removeJSON("pp.cooking");
    expect(readJSON("pp.cooking", null)).toBeNull();
    expect(retryStorageWrites()).toBe(true);
    expect(mock.values.has("pp.cooking")).toBe(false);
  });
  it("после ошибки переноса повторяет весь файл, даже если старый экран успел записать свои данные", async () => {
    const mock = storage();
    const { writeJSON, hasUnsavedChanges } = await import("./storage");
    const { startImport, retryPendingImport, hasPendingImport, exportBundle } = await import("./transfer");
    mock.setItem.mockImplementation(() => { throw new Error("quota"); });
    expect(startImport({ v: 1, at: "2026-11-06", data: { "pp.favorites": ["banana-syrniki"] } })).toBe(false);
    mock.setItem.mockImplementation((key, value) => { mock.values.set(key, value); });
    writeJSON("pp.favorites", ["old-screen"]);
    expect(hasUnsavedChanges()).toBe(false);
    expect(hasPendingImport()).toBe(true);
    expect(exportBundle().data["pp.favorites"]).toEqual(["banana-syrniki"]);
    expect(retryPendingImport()).toBe(true);
    expect(JSON.parse(mock.values.get("pp.favorites")!)).toEqual(["banana-syrniki"]);
  });
});
