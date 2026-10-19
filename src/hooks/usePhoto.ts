import { useEffect, useState } from "react";
import { loadPhoto } from "../lib/photos";

/** Адрес своего фото блюда или null. `version` меняется при замене фото и заставляет перечитать его. */
export function usePhotoUrl(id: string, version: number | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!version) {
      setUrl(null);
      return;
    }
    let made: string | null = null;
    let alive = true;
    loadPhoto(id).then((blob) => {
      if (!alive || !blob) return;
      made = URL.createObjectURL(blob);
      setUrl(made);
    });
    return () => {
      alive = false;
      if (made) URL.revokeObjectURL(made);
    };
  }, [id, version]);
  return url;
}
