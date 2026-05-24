import { useCallback } from 'react';
import { STORAGE_KEY } from '../constants';

/**
 * Export / Import the full app config (localStorage state)
 * as a `.pcboost` JSON file via native save/open dialogs.
 */

interface ConfigPayload {
  _format: 'pcboost-config';
  _version: 1;
  exportedAt: string;
  state: Record<string, unknown>;
}

export function useConfigIO(
  onImported: (state: Record<string, unknown>) => void,
  showToast: (msg: string, kind?: string) => void,
) {
  const exportConfig = useCallback(async () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      showToast('Nada pra exportar — nenhuma config salva.', 'error');
      return;
    }

    const payload: ConfigPayload = {
      _format: 'pcboost-config',
      _version: 1,
      exportedAt: new Date().toISOString(),
      state: JSON.parse(raw),
    };
    const json = JSON.stringify(payload, null, 2);

    if ((window as any).__TAURI_INTERNALS__) {
      try {
        const { save } = await import('@tauri-apps/plugin-dialog');
        const { writeTextFile } = await import('@tauri-apps/plugin-fs');

        const path = await save({
          title: 'Exportar configuração',
          defaultPath: 'pcboost-config.json',
          filters: [{ name: 'PCBoost Config', extensions: ['json'] }],
        });

        if (path) {
          await writeTextFile(path, json);
          showToast('Configuração exportada com sucesso.');
        }
      } catch (err) {
        console.error('[ConfigIO] Export error:', err);
        showToast('Erro ao exportar configuração.', 'error');
      }
    } else {
      // Dev fallback: browser download
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pcboost-config.json';
      a.click();
      URL.revokeObjectURL(url);
      showToast('Configuração exportada (dev mode).');
    }
  }, [showToast]);

  const importConfig = useCallback(async () => {
    if ((window as any).__TAURI_INTERNALS__) {
      try {
        const { open } = await import('@tauri-apps/plugin-dialog');
        const { readTextFile } = await import('@tauri-apps/plugin-fs');

        const path = await open({
          title: 'Importar configuração',
          filters: [{ name: 'PCBoost Config', extensions: ['json'] }],
          multiple: false,
          directory: false,
        });

        if (!path) return; // cancelled

        const content = await readTextFile(path as string);
        const payload: ConfigPayload = JSON.parse(content);

        if (payload._format !== 'pcboost-config') {
          showToast('Arquivo inválido — não é uma config do PCBoost.', 'error');
          return;
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload.state));
        onImported(payload.state);
        showToast('Configuração importada. Aplicando...');
      } catch (err) {
        console.error('[ConfigIO] Import error:', err);
        showToast('Erro ao importar configuração.', 'error');
      }
    } else {
      // Dev fallback: file input
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        try {
          const text = await file.text();
          const payload: ConfigPayload = JSON.parse(text);

          if (payload._format !== 'pcboost-config') {
            showToast('Arquivo inválido — não é uma config do PCBoost.', 'error');
            return;
          }

          localStorage.setItem(STORAGE_KEY, JSON.stringify(payload.state));
          onImported(payload.state);
          showToast('Configuração importada (dev mode). Aplicando...');
        } catch {
          showToast('Erro ao ler o arquivo.', 'error');
        }
      };
      input.click();
    }
  }, [onImported, showToast]);

  return { exportConfig, importConfig };
}
