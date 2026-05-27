/**
 * useAutostart — Manages "Start with Windows" feature.
 * Uses HKCU\Software\Microsoft\Windows\CurrentVersion\Run registry key.
 * No admin required.
 */
import { useState, useEffect, useCallback } from 'react';

/** Convert script to Base64 UTF-16LE for PowerShell -EncodedCommand */
function encodePS(script: string): string {
  const buf = new Uint8Array(script.length * 2);
  for (let i = 0; i < script.length; i++) {
    buf[i * 2] = script.charCodeAt(i) & 0xFF;
    buf[i * 2 + 1] = (script.charCodeAt(i) >> 8) & 0xFF;
  }
  let bin = '';
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  return btoa(bin);
}

/** Detect if autostart is enabled */
const DETECT_SCRIPT = [
  '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8',
  'try{$v=(Get-ItemProperty "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" -Name "NTZ PCBooster" -EA Stop)."NTZ PCBooster";if($v){"true"}else{"false"}}catch{"false"}',
].join('\n');

/** Enable autostart: find running process path and add to Run key */
const ENABLE_SCRIPT = [
  '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8',
  '$proc = Get-Process | Where-Object { $_.ProcessName -like \'*PCBoost*\' -or $_.ProcessName -like \'*NTZ*\' } | Select-Object -First 1',
  'if (-not $proc) { throw "Could not find running process" }',
  '$exe = $proc.MainModule.FileName',
  'if (-not $exe) { throw "Could not get exe path" }',
  'Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" -Name "NTZ PCBooster" -Value $exe',
  '"ok"',
].join('\n');

/** Disable autostart */
const DISABLE_SCRIPT = [
  '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8',
  'Remove-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" -Name "NTZ PCBooster" -EA SilentlyContinue',
  '"ok"',
].join('\n');

async function runPS(script: string): Promise<string> {
  if (!(window as any).__TAURI_INTERNALS__) return '';
  const { Command } = await import('@tauri-apps/plugin-shell');
  const encoded = encodePS(script);
  const output = await Command.create('powershell', [
    '-NoProfile', '-ExecutionPolicy', 'Bypass',
    '-EncodedCommand', encoded,
  ]).execute();
  return (output.stdout || '').trim();
}

export function useAutostart() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  // Detect on mount
  useEffect(() => {
    runPS(DETECT_SCRIPT).then(out => {
      setEnabled(out === 'true');
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const toggle = useCallback(async (val: boolean) => {
    setLoading(true);
    try {
      const result = await runPS(val ? ENABLE_SCRIPT : DISABLE_SCRIPT);
      if (result.includes('ok')) {
        setEnabled(val);
      }
    } catch (err) {
      console.error('[PCBoost] Autostart toggle failed:', err);
    }
    setLoading(false);
  }, []);

  return { enabled, loading, toggle };
}
