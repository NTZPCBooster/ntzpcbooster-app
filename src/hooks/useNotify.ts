import { useCallback } from 'react';

/**
 * Native Windows toast notifications via tauri-plugin-notification.
 *
 * Returns a `notify(title, body)` function.
 * - In Tauri: sends a real Windows toast.
 * - In browser dev: logs to console (no crash).
 */
export function useNotify() {
  const notify = useCallback(async (title: string, body: string) => {
    if (!(window as any).__TAURI_INTERNALS__) {
      console.log(`[Notify] ${title}: ${body}`);
      return;
    }

    try {
      const {
        isPermissionGranted,
        requestPermission,
        sendNotification,
      } = await import('@tauri-apps/plugin-notification');

      let granted = await isPermissionGranted();
      if (!granted) {
        const perm = await requestPermission();
        granted = perm === 'granted';
      }
      if (granted) {
        sendNotification({ title, body });
      }
    } catch (err) {
      console.warn('[Notify] Failed:', err);
    }
  }, []);

  return notify;
}
