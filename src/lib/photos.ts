// Свои фото блюд. Хранятся в IndexedDB этого браузера: в localStorage картинки не помещаются.
// Если IndexedDB недоступна (приватный режим), функции тихо возвращают null/false.

const DB = "pp-photos";
const STORE = "photos";

function open(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  const db = await open();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export const loadPhoto = (id: string) => run<Blob | undefined>("readonly", (s) => s.get(id)).then((b) => b ?? null);
export const deletePhoto = (id: string) => run("readwrite", (s) => s.delete(id)).then((r) => r !== null);

/** Уменьшает снимок до 1200 px по длинной стороне и сохраняет JPEG. */
export async function savePhoto(id: string, file: File): Promise<boolean> {
  const blob = await shrink(file).catch(() => null);
  if (!blob) return false;
  return (await run("readwrite", (s) => s.put(blob, id))) !== null;
}

async function shrink(file: File, max = 1200): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * k);
  canvas.height = Math.round(bitmap.height * k);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob"))), "image/jpeg", 0.82),
  );
}
