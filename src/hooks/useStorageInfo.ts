import { useState, useEffect, useCallback } from "react";

/** Map of optimization id → size in MB */
export type StorageSizes = Record<string, number>;

function encodePS(script: string): string {
  const buf = new Uint8Array(script.length * 2);
  for (let i = 0; i < script.length; i++) {
    buf[i * 2] = script.charCodeAt(i) & 0xff;
    buf[i * 2 + 1] = (script.charCodeAt(i) >> 8) & 0xff;
  }
  let bin = "";
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  return btoa(bin);
}

const MEASURE_SCRIPT = `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Get-FolderSize($paths) {
  $total = 0
  foreach ($p in $paths) {
    if (Test-Path $p) {
      $total += (Get-ChildItem $p -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum
    }
  }
  return [math]::Round($total / 1MB, 1)
}

$result = @{}

# temp-files
$result['temp-files'] = Get-FolderSize @("$env:TEMP","C:\\Windows\\Temp")

# prefetch
$result['prefetch'] = Get-FolderSize @("C:\\Windows\\Prefetch")

# winupdate-cache
$result['winupdate-cache'] = Get-FolderSize @("C:\\Windows\\SoftwareDistribution\\Download")

# thumbnails
$result['thumbnails'] = Get-FolderSize @("$env:LOCALAPPDATA\\Microsoft\\Windows\\Explorer")

# browser-cache
$chromePaths = @(
  "$env:LOCALAPPDATA\\Google\\Chrome\\User Data\\Default\\Cache",
  "$env:LOCALAPPDATA\\Google\\Chrome\\User Data\\Default\\Code Cache"
)
$edgePaths = @(
  "$env:LOCALAPPDATA\\Microsoft\\Edge\\User Data\\Default\\Cache",
  "$env:LOCALAPPDATA\\Microsoft\\Edge\\User Data\\Default\\Code Cache"
)
$firefoxBase = "$env:LOCALAPPDATA\\Mozilla\\Firefox\\Profiles"
$ffPaths = @()
if (Test-Path $firefoxBase) {
  $ffPaths = Get-ChildItem $firefoxBase -Directory | ForEach-Object { "$($_.FullName)\\cache2" }
}
$allBrowser = $chromePaths + $edgePaths + $ffPaths
$result['browser-cache'] = Get-FolderSize $allBrowser

# shader-cache
$result['shader-cache'] = Get-FolderSize @("$env:LOCALAPPDATA\\D3DSCache","$env:LOCALAPPDATA\\NVIDIA\\DXCache","$env:LOCALAPPDATA\\AMD\\DxCache")

# win-logs
$result['win-logs'] = Get-FolderSize @("C:\\Windows\\Logs")

# recycle bin (approximate)
try {
  $shell = New-Object -ComObject Shell.Application
  $rb = $shell.Namespace(0x0A)
  $rbSize = 0
  if ($rb -and $rb.Items()) { $rbSize = ($rb.Items() | Measure-Object -Property Size -Sum -ErrorAction SilentlyContinue).Sum }
  $result['recycle'] = [math]::Round($rbSize / 1MB, 1)
} catch {
  $result['recycle'] = 0
}

$result | ConvertTo-Json -Compress
`;

export function useStorageInfo() {
  const [sizes, setSizes] = useState<StorageSizes>({});
  const [loading, setLoading] = useState(true);
  const [totalMB, setTotalMB] = useState(0);

  const measure = useCallback(async () => {
    if (!(window as any).__TAURI_INTERNALS__) {
      // Dev mock
      const mock: StorageSizes = {
        "temp-files": 2340,
        "prefetch": 180,
        "winupdate-cache": 890,
        "thumbnails": 45,
        "browser-cache": 1200,
        "shader-cache": 320,
        "win-logs": 150,
        "recycle": 560,
      };
      setSizes(mock);
      setTotalMB(Object.values(mock).reduce((a, b) => a + b, 0));
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { Command } = await import("@tauri-apps/plugin-shell");
      const encoded = encodePS(MEASURE_SCRIPT);
      const cmd = Command.create("powershell", [
        "-NoProfile", "-ExecutionPolicy", "Bypass",
        "-EncodedCommand", encoded,
      ]);
      const output = await cmd.execute();
      const stdout = (output.stdout || "").trim();

      if (stdout) {
        const parsed = JSON.parse(stdout);
        const result: StorageSizes = {};
        for (const [key, val] of Object.entries(parsed)) {
          result[key] = typeof val === "number" ? val : 0;
        }
        setSizes(result);
        setTotalMB(Object.values(result).reduce((a, b) => a + b, 0));
      }
    } catch (err) {
      console.error("[Storage] Measure failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    measure();
  }, [measure]);

  return { sizes, totalMB, loading, remeasure: measure };
}

/** Format MB to a human-readable string */
export function formatSize(mb: number): string {
  if (mb <= 0) return "0 MB";
  if (mb < 1) return `${Math.round(mb * 1024)} KB`;
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${Math.round(mb)} MB`;
}
