import { useEffect } from "react";

/**
 * Intercepts the window close event. If `minimizeToTray` is true,
 * hides the window instead of closing it (sends to system tray).
 */
export function useTrayClose(minimizeToTray: boolean) {
  useEffect(() => {
    if (!(window as any).__TAURI_INTERNALS__) return;

    let unlisten: (() => void) | null = null;

    (async () => {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const appWindow = getCurrentWindow();

      unlisten = await appWindow.onCloseRequested(async (event) => {
        if (minimizeToTray) {
          event.preventDefault();
          await appWindow.hide();
        }
        // If minimizeToTray is false, let the default close happen
      });
    })();

    return () => {
      if (unlisten) unlisten();
    };
  }, [minimizeToTray]);
}
