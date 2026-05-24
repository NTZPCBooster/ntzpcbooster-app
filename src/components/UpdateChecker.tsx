import { useState, useEffect, useCallback } from "react";
import { Icon } from "./primitives";

type UpdateStatus = "idle" | "checking" | "available" | "downloading" | "ready" | "error";

interface UpdateInfo {
  version: string;
  body: string;
}

export function UpdateChecker() {
  const [status, setStatus] = useState<UpdateStatus>("idle");
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [dismissed, setDismissed] = useState(false);

  const checkForUpdate = useCallback(async () => {
    // Only run in Tauri environment
    if (!(window as any).__TAURI_INTERNALS__) return;

    try {
      setStatus("checking");
      const { check } = await import("@tauri-apps/plugin-updater");
      const update = await check();

      if (update) {
        setInfo({
          version: update.version,
          body: update.body || "",
        });
        setStatus("available");
      } else {
        setStatus("idle");
      }
    } catch (err) {
      console.error("[Updater] Check failed:", err);
      setStatus("idle"); // silent fail — don't bother user
    }
  }, []);

  // Check on mount (after 3s delay to not block startup)
  useEffect(() => {
    const timer = setTimeout(checkForUpdate, 3000);
    return () => clearTimeout(timer);
  }, [checkForUpdate]);

  const handleUpdate = useCallback(async () => {
    if (!(window as any).__TAURI_INTERNALS__) return;

    try {
      setStatus("downloading");
      const { check } = await import("@tauri-apps/plugin-updater");
      const update = await check();

      if (!update) {
        setStatus("idle");
        return;
      }

      let downloaded = 0;
      let contentLength = 0;

      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case "Started":
            contentLength = event.data.contentLength || 0;
            setProgress(0);
            break;
          case "Progress":
            downloaded += event.data.chunkLength;
            if (contentLength > 0) {
              setProgress(Math.round((downloaded / contentLength) * 100));
            }
            break;
          case "Finished":
            setStatus("ready");
            break;
        }
      });

      // Relaunch after install
      const { relaunch } = await import("@tauri-apps/plugin-process");
      await relaunch();
    } catch (err) {
      console.error("[Updater] Download/install failed:", err);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 5000);
    }
  }, []);

  // Don't render anything if dismissed, idle, or checking
  if (dismissed || status === "idle" || status === "checking") return null;

  return (
    <div className="updater-banner">
      {status === "available" && (
        <>
          <div className="updater-banner__info">
            <Icon name="arrow-circle-up" size={18} />
            <span>
              Nova versao disponivel: <strong>v{info?.version}</strong>
            </span>
          </div>
          <div className="updater-banner__actions">
            <button className="updater-banner__btn updater-banner__btn--update" onClick={handleUpdate}>
              Atualizar agora
            </button>
            <button className="updater-banner__btn updater-banner__btn--dismiss" onClick={() => setDismissed(true)}>
              Depois
            </button>
          </div>
        </>
      )}

      {status === "downloading" && (
        <div className="updater-banner__info">
          <Icon name="spinner" size={18} />
          <span>Baixando atualização... {progress > 0 ? `${progress}%` : ""}</span>
          <div className="updater-banner__progress">
            <div className="updater-banner__progress-bar" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {status === "ready" && (
        <div className="updater-banner__info">
          <Icon name="check-circle" size={18} />
          <span>Atualização instalada! Reiniciando...</span>
        </div>
      )}

      {status === "error" && (
        <div className="updater-banner__info updater-banner__info--error">
          <Icon name="alert" size={18} />
          <span>Erro ao atualizar. Tente novamente mais tarde.</span>
        </div>
      )}
    </div>
  );
}
