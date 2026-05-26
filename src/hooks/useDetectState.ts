/**
 * useDetectState — Detects which optimizations are already applied on the
 * system by querying registry values, service states, and system settings.
 *
 * Runs a single non-admin PowerShell script on mount (no UAC prompt).
 * Registry reads (even HKLM) and service queries don't require elevation.
 *
 * Returns a Record<string, boolean> mapping optimization IDs to their
 * current applied state. Only checks toggle-able items (not runOnce/limpeza).
 */
import { useState, useEffect } from 'react';

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

// ── Detection PowerShell script ──────────────────────────
// _U(path, name) → reads HKCU value, returns '__NF__' if missing
// _M(path, name) → reads HKLM value, returns '__NF__' if missing
// _S(name) → returns service StartType as string
//
// IMPORTANT: Single-letter function names like H and S conflict with
// PowerShell aliases (H → Get-History, etc). Use underscore-prefixed
// names to avoid all alias collisions.
//
// '__NF__' sentinel ensures $null -eq 0 doesn't false-positive:
//   '__NF__' -eq 0 → $false
//   '__NF__' -eq 1 → $false
//   0 -eq 0        → $true
const DETECT_SCRIPT = [
  // Force UTF-8 output so Tauri (Rust) can decode stdout/stderr.
  `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8`,
  `function _U($p,$n){try{return(Get-ItemProperty "HKCU:\\$p" -Name $n -EA Stop).$n}catch{return '__NF__'}}`,
  `function _M($p,$n){try{return(Get-ItemProperty "HKLM:\\$p" -Name $n -EA Stop).$n}catch{return '__NF__'}}`,
  `function _S($n){try{return(Get-Service $n -EA Stop).StartType.ToString()}catch{return ''}}`,
  `$r=@{}`,
  // ── Gaming ──
  `try{$r['ultimate-power']=[bool]((powercfg /getactivescheme) -match 'e9a42b02')}catch{$r['ultimate-power']=$false}`,
  `$r['core-isolation']=(_M 'SYSTEM\\CurrentControlSet\\Control\\DeviceGuard\\Scenarios\\HypervisorEnforcedCodeIntegrity' 'Enabled') -eq 0`,
  `if([Environment]::OSVersion.Version.Build -ge 22000){$r['game-bar']=(_U 'Software\\Microsoft\\Windows\\CurrentVersion\\BackgroundAccessApplications\\Microsoft.XboxGamingOverlay_8wekyb3d8bbwe' 'Disabled') -eq 1}else{$r['game-bar']=(_U 'SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\GameDVR' 'AppCaptureEnabled') -eq 0}`,
  `$r['bg-apps']=(_U 'Software\\Microsoft\\Windows\\CurrentVersion\\BackgroundAccessApplications' 'GlobalUserDisabled') -eq 1`,
  `$r['copilot']=(_U 'Software\\Policies\\Microsoft\\Windows\\WindowsCopilot' 'TurnOffWindowsCopilot') -eq 1`,
  `$r['mouse-accel']=(_U 'Control Panel\\Mouse' 'MouseSpeed') -eq '0'`,
  `$r['hibernation']=(_M 'SYSTEM\\CurrentControlSet\\Control\\Power' 'HibernateEnabled') -eq 0`,
  `$r['wifi-sense']=(_M 'SOFTWARE\\Microsoft\\WcmSvc\\wifinetworkmanager\\config' 'AutoConnectAllowedOEM') -eq 0`,
  `$r['bsod-detail']=(_M 'SYSTEM\\CurrentControlSet\\Control\\CrashControl' 'DisplayParameters') -eq 1`,
  `$r['nagle']=(_M 'SOFTWARE\\Microsoft\\MSMQ\\Parameters' 'TCPNoDelay') -eq 1`,
  `$r['fullscreen-opt']=(_U 'System\\GameConfigStore' 'GameDVR_FSEBehaviorMode') -eq 2`,
  `$r['visual-fx']=(_U 'Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\VisualEffects' 'VisualFXSetting') -eq 2`,
  `$r['sysmain']=(_S 'SysMain') -eq 'Disabled'`,
  `$r['win-search']=(_S 'WSearch') -eq 'Disabled'`,
  `$r['gpu-sched']=(_M 'SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers' 'HwSchMode') -eq 2`,
  `$r['power-throttle']=(_M 'SYSTEM\\CurrentControlSet\\Control\\Power\\PowerThrottling' 'PowerThrottlingOff') -eq 1`,
  `$r['print-spool']=(_S 'Spooler') -eq 'Disabled'`,
  `$r['ntfs-opt']=(_M 'SYSTEM\\CurrentControlSet\\Control\\FileSystem' 'NtfsDisableLastAccessUpdate') -eq 1`,
  `$r['gpu-perf']=[bool]((_U 'Software\\Microsoft\\DirectX\\UserGpuPreferences' 'DirectXUserGlobalSettings') -match 'GpuPreference=2')`,
  `$r['game-mode']=(_U 'Software\\Microsoft\\GameBar' 'AllowAutoGameMode') -eq 0`,
  `$r['fast-startup']=(_M 'SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power' 'HiberbootEnabled') -eq 0`,
  `$r['ntfs-8dot3']=(_M 'SYSTEM\\CurrentControlSet\\Control\\FileSystem' 'NtfsDisable8dot3NameCreation') -eq 1`,
  `$r['sticky-keys']=(_U 'Control Panel\\Accessibility\\StickyKeys' 'Flags') -eq '506'`,
  `$r['edge-bg']=(_M 'SOFTWARE\\Policies\\Microsoft\\Edge' 'StartupBoostEnabled') -eq 0`,
  `$r['nv-opt']=((_M 'SOFTWARE\\NVIDIA Corporation\\NvControlPanel2\\Client' 'OptInOrOutPreference') -eq 0) -and ((_M 'SYSTEM\\CurrentControlSet\\Services\\nvlddmkm\\Global\\NVTweak' 'RmGpsPsEnablePerCpuCoreDpc') -eq 1)`,
  // ── GPU NVIDIA ──
  `try{$nvOk=$false;Get-ChildItem 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}' -EA Stop|ForEach-Object{$d=(Get-ItemProperty $_.PSPath -Name DriverDesc -EA SilentlyContinue).DriverDesc;if($d -match 'NVIDIA'){$v=(Get-ItemProperty $_.PSPath -Name PowerMizerLevel -EA SilentlyContinue).PowerMizerLevel;if($v -eq 1){$nvOk=$true}}};$r['nv-power-max']=$nvOk}catch{$r['nv-power-max']=$false}`,
  `$r['nv-low-latency']=(_M 'SOFTWARE\\NVIDIA Corporation\\Global\\NVTweak' 'Low_Latency_Mode') -eq 2`,
  `$r['nv-threaded-opt']=(_M 'SOFTWARE\\NVIDIA Corporation\\Global\\NVTweak' 'Threaded_Optimization') -eq 1`,
  `$r['nv-tex-quality']=(_M 'SOFTWARE\\NVIDIA Corporation\\Global\\NVTweak' 'Texture_Filtering_Quality') -eq 0`,
  `$r['nv-vsync-off']=(_M 'SOFTWARE\\NVIDIA Corporation\\Global\\NVTweak' 'VSyncMode') -eq 0`,
  `$r['nv-shader-cache']=[bool]((_M 'SOFTWARE\\NVIDIA Corporation\\Global\\NVTweak' 'ShaderCache_Size') -eq 0xFFFFFFFF -or (_M 'SOFTWARE\\NVIDIA Corporation\\Global\\NVTweak' 'ShaderCache_Size') -eq 4294967295)`,
  // ── GPU AMD ──
  `$r['amd-gpu-workload']=(_U 'Software\\AMD\\CN' 'GpuWorkload') -eq '1'`,
  `$r['amd-tex-filter']=(_U 'Software\\AMD\\CN' 'TFQ') -eq '0'`,
  `$r['amd-vsync-off']=(_U 'Software\\AMD\\CN' 'WaitForVerticalRefresh') -eq '0'`,
  `$r['amd-surface-opt']=(_U 'Software\\AMD\\CN' 'SurfaceFormatOptimization') -eq '1'`,
  `$r['amd-shader-cache']=(_U 'Software\\AMD\\CN' 'ShaderCache') -eq '1'`,
  `$r['amd-anti-lag']=(_U 'Software\\AMD\\CN' 'AntiLag') -eq '1'`,
  // ── Tweaks ──
  `$r['taskbar-left']=(_U 'Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' 'TaskbarAl') -eq 0`,
  `$r['lock-tips']=(_U 'Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager' 'RotatingLockScreenOverlayEnabled') -eq 0`,
  `$r['telemetry']=(_M 'SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection' 'AllowTelemetry') -eq 0`,
  `$r['notif']=(_U 'Software\\Microsoft\\Windows\\CurrentVersion\\PushNotifications' 'ToastEnabled') -eq 0`,
  `$r['app-suggestions']=(_U 'Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager' 'SilentInstalledAppsEnabled') -eq 0`,
  `$r['bing-search']=(_U 'Software\\Microsoft\\Windows\\CurrentVersion\\Search' 'BingSearchEnabled') -eq 0`,
  `$r['widgets']=(_U 'Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' 'TaskbarDa') -eq 0`,
  `$r['classic-menu']=(Test-Path 'HKCU:\\Software\\Classes\\CLSID\\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\\InprocServer32')`,
  `$r['end-task']=(_U 'Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced\\TaskbarDeveloperSettings' 'TaskbarEndTask') -eq 1`,
  `$r['task-view']=(_U 'Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' 'ShowTaskViewButton') -eq 0`,
  `$r['explorer-thispc']=(_U 'Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' 'LaunchTo') -eq 1`,
  `try{$r['system-sounds']=((Get-Item 'HKCU:\\AppEvents\\Schemes').GetValue('')) -eq '.None'}catch{$r['system-sounds']=$false}`,
  `$r['tray-icons']=(_U 'Software\\Microsoft\\Windows\\CurrentVersion\\Explorer' 'EnableAutoTray') -eq 0`,
  `$r['menu-delay']=(_U 'Control Panel\\Desktop' 'MenuShowDelay') -eq '0'`,
  // Output
  `$r|ConvertTo-Json`,
].join('\n');

/** Extract a JSON object from stdout that may contain BOM, warnings, or extra text */
function extractJSON(raw: string): unknown | null {
  // Strip BOM and trim
  let s = raw.replace(/^﻿/, '').trim();
  // Try parsing directly first
  try { return JSON.parse(s); } catch { /* continue */ }
  // Find the outermost { ... } in the output
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try { return JSON.parse(s.slice(start, end + 1)); } catch { /* continue */ }
  }
  return null;
}

interface DetectResult {
  state: Record<string, boolean> | null;
  error: string | null;
}

/** Runs the detection script and returns a map of optimization ID → applied */
async function detectState(): Promise<DetectResult> {
  if (!(window as any).__TAURI_INTERNALS__) {
    return { state: null, error: 'no-tauri' };
  }
  try {
    const { Command } = await import('@tauri-apps/plugin-shell');
    const encoded = encodePS(DETECT_SCRIPT);
    console.log(`[PCBoost] Detection script length: ${DETECT_SCRIPT.length} chars, encoded: ${encoded.length} chars`);
    const cmd = Command.create('powershell', [
      '-NoProfile', '-ExecutionPolicy', 'Bypass',
      '-EncodedCommand', encoded,
    ]);
    // Timeout after 15s to avoid hanging
    const output = await Promise.race([
      cmd.execute(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout: detecção demorou mais de 15s')), 15000)
      ),
    ]);
    console.log(`[PCBoost] Detection exit code: ${output.code}`);
    console.log(`[PCBoost] Detection stdout (first 500): ${(output.stdout || '').slice(0, 500)}`);
    if (output.stderr) {
      console.warn(`[PCBoost] Detection stderr (first 500): ${output.stderr.slice(0, 500)}`);
    }

    const stdout = (output.stdout || '').trim();
    if (!stdout) {
      return { state: null, error: `Sem saída (code=${output.code}). stderr: ${(output.stderr || '').slice(0, 200)}` };
    }

    const data = extractJSON(stdout);
    if (!data || typeof data !== 'object') {
      return { state: null, error: `JSON inválido. stdout: ${stdout.slice(0, 200)}` };
    }

    const result: Record<string, boolean> = {};
    for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
      result[key] = val === true;
    }
    return { state: result, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[PCBoost] Detection failed:', msg);
    return { state: null, error: msg };
  }
}

/**
 * Hook that detects which optimizations are already applied on the system.
 * Returns detected state map (or null while loading / on browser dev mode),
 * plus an error string if detection failed.
 */
export function useDetectState() {
  const [detected, setDetected] = useState<Record<string, boolean> | null>(null);
  const [detectLoading, setDetectLoading] = useState(true);
  const [detectError, setDetectError] = useState<string | null>(null);

  useEffect(() => {
    detectState().then(({ state, error }) => {
      if (state) {
        console.log('[PCBoost] Detected state:', state);
        setDetected(state);
      }
      if (error) {
        console.error('[PCBoost] Detection error:', error);
        setDetectError(error);
      }
      setDetectLoading(false);
    });
  }, []);

  return { detected, detectLoading, detectError };
}
