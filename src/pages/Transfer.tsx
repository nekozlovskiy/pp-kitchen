import { useState } from "react";
import { decodeBundle, encodeBundle, exportBundle, importBundle } from "../lib/transfer";
import { useStore } from "../hooks/useStore";

const FILE_NAME = "pp-kuhnya.json";

export function Transfer() {
  const { showToast } = useStore();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const makeFile = () => new File([JSON.stringify(exportBundle())], FILE_NAME, { type: "application/json" });
  const canShare = typeof navigator.canShare === "function" && navigator.canShare({ files: [makeFile()] });

  const download = () => {
    const url = URL.createObjectURL(makeFile());
    const a = document.createElement("a");
    a.href = url;
    a.download = FILE_NAME;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const share = async () => {
    try {
      await navigator.share({ files: [makeFile()], title: "ПП-кухня: мои отметки" });
    } catch {
      /* пользователь закрыл меню «Поделиться» */
    }
  };

  const copyCode = async () => {
    const text = encodeBundle(exportBundle());
    try {
      await navigator.clipboard.writeText(text);
      showToast("Код скопирован — вставьте его на другом телефоне");
    } catch {
      setCode(text);
      showToast("Скопируйте код из поля ниже");
    }
  };

  const apply = (text: string) => {
    const bundle = decodeBundle(text);
    if (!bundle) {
      setError("Это не похоже на файл или код ПП-кухни. Проверьте, что скопировали его целиком.");
      return;
    }
    if (!window.confirm("Заменить избранное, отметки и списки на этом устройстве перенесёнными?")) return;
    importBundle(bundle);
    window.location.reload();
  };

  return (
    <main className="transfer wrap">
      <header className="page-head">
        <h1 className="page-title">Перенос на другое устройство</h1>
        <p className="page-sub">
          Избранное, оценки и заметки, «Мой день», меню недели, покупки, цели и замены хранятся только в этом браузере. Перенесите их файлом или кодом. Фото из дневника не переносятся.
        </p>
      </header>

      <section className="transfer__block">
        <h2>Отсюда</h2>
        <div className="transfer__actions">
          {canShare && (
            <button type="button" className="btn btn--accent" onClick={share}>
              Поделиться файлом
            </button>
          )}
          <button type="button" className={`btn ${canShare ? "btn--ghost" : "btn--accent"}`} onClick={download}>
            Скачать файл
          </button>
          <button type="button" className="btn btn--ghost" onClick={copyCode}>
            Скопировать код
          </button>
        </div>
      </section>

      <section className="transfer__block">
        <h2>Сюда</h2>
        <label className="transfer__file btn btn--ghost">
          Открыть файл
          <input
            type="file"
            accept="application/json,.json"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) apply(await f.text());
              e.target.value = "";
            }}
          />
        </label>
        <label className="transfer__code">
          <span>или вставьте код</span>
          <textarea
            rows={4}
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setError("");
            }}
            placeholder="PP1:…"
          />
        </label>
        {error && <p className="transfer__error">{error}</p>}
        <button type="button" className="btn btn--accent" disabled={!code.trim()} onClick={() => apply(code)}>
          Перенести
        </button>
      </section>
    </main>
  );
}
