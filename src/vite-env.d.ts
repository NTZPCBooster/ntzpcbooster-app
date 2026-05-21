/// <reference types="vite/client" />

interface Window {
  __TAURI__?: Record<string, unknown>;
}
