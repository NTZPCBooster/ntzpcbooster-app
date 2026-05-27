/**
 * License management for PCBoost.
 *
 * Handles activation, validation, device binding (motherboard serial),
 * and periodic revalidation.
 *
 * TODO: Set API_URL and API_KEY with your Supabase project credentials.
 */

// ── Config ────────────────────────────────────────
// Supabase Edge Function URL + anon key
// In dev mode (empty strings): accepts any key with 16+ chars
// In production: set these to your Supabase project values
const API_URL = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || '';
const API_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const STORAGE_KEY = 'pcboost_lic';
const CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

// ── Types ─────────────────────────────────────────
export interface LicenseInfo {
  key: string;
  email: string;
  plan: 'vitalicio' | 'mensal' | 'anual';
  moboId: string;
  activatedAt: string;
  lastChecked: string;
}

// ── Base64 UTF-16LE encoder (same pattern as App.tsx) ─
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

// ── Device ID (Motherboard Serial) ────────────────
/**
 * Reads the motherboard serial number via PowerShell.
 * Falls back to BIOS serial if mobo serial is generic/missing.
 */
export async function getMotherboardId(): Promise<string> {
  if (!(window as any).__TAURI_INTERNALS__) {
    return 'DEV-MOBO-00000';
  }

  const { Command } = await import('@tauri-apps/plugin-shell');

  const script = [
    '[Console]::OutputEncoding=[System.Text.Encoding]::UTF8',
    '$s=(Get-WmiObject Win32_BaseBoard).SerialNumber',
    "if(!$s -or $s -match 'O\\.E\\.M|Default|To be filled|Not Spec'){$s=(Get-WmiObject Win32_BIOS).SerialNumber}",
    '$s.Trim()',
  ].join('; ');

  const encoded = encodePS(script);
  const cmd = Command.create('powershell', [
    '-NoProfile', '-ExecutionPolicy', 'Bypass',
    '-EncodedCommand', encoded,
  ]);

  const output = await cmd.execute();
  const serial = (output.stdout || '').trim();

  if (!serial) {
    throw new Error('Nao foi possivel identificar a placa-mae');
  }

  return serial;
}

// ── Local Storage ─────────────────────────────────
export function getLicense(): LicenseInfo | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function storeLicense(info: LicenseInfo): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
}

export function clearLicense(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// ── Key Validation ────────────────────────────────
/**
 * Validates a license key against the server and binds it to the motherboard.
 * In dev mode (no API_URL), accepts any key with 16+ alphanumeric chars.
 */
export async function validateKey(
  key: string,
  moboId: string,
): Promise<{ valid: boolean; error?: string; data?: LicenseInfo }> {
  // ── Dev mode: mock validation ──
  if (!API_URL) {
    const clean = key.replace(/-/g, '');
    if (clean.length >= 16) {
      return {
        valid: true,
        data: {
          key,
          email: 'dev@pcboost.com',
          plan: 'vitalicio',
          moboId,
          activatedAt: new Date().toISOString(),
          lastChecked: new Date().toISOString(),
        },
      };
    }
    return { valid: false, error: 'Chave invalida. Verifique e tente novamente.' };
  }

  // ── Production: call Supabase Edge Function ──
  try {
    const res = await fetch(`${API_URL}/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': API_KEY,
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({ key, moboId }),
    });

    const body = await res.json();

    if (!res.ok || !body.valid) {
      return { valid: false, error: body.error || 'Chave invalida.' };
    }

    return {
      valid: true,
      data: {
        key,
        email: body.email || '',
        plan: body.plan || 'vitalicio',
        moboId,
        activatedAt: body.activatedAt || new Date().toISOString(),
        lastChecked: new Date().toISOString(),
      },
    };
  } catch {
    return { valid: false, error: 'Sem conexao. Verifique sua internet e tente novamente.' };
  }
}

// ── Periodic Revalidation ─────────────────────────
/**
 * Checks if the stored license is still valid.
 * - Within 24h of last check: valid (offline grace).
 * - After 24h: tries server revalidation.
 * - No internet after 24h: still valid (grace period).
 * - Server says invalid: clears license.
 */
export async function checkStoredLicense(): Promise<boolean> {
  const license = getLicense();
  if (!license) return false;

  const elapsed = Date.now() - new Date(license.lastChecked).getTime();

  // Within grace period — valid without server check
  if (elapsed < CHECK_INTERVAL) return true;

  // Dev mode — always valid
  if (!API_URL) return true;

  // Try server revalidation
  try {
    const res = await fetch(`${API_URL}/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': API_KEY,
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({ key: license.key, moboId: license.moboId }),
    });

    const body = await res.json();

    if (body.valid) {
      storeLicense({ ...license, lastChecked: new Date().toISOString() });
      return true;
    }

    // License revoked
    clearLicense();
    return false;
  } catch {
    // No internet — extend grace period
    return true;
  }
}
