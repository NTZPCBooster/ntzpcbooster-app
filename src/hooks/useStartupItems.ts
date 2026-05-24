import { useState, useEffect, useCallback } from "react";

export interface StartupItem {
  name: string;
  command: string;
  source: string;     // "Registro (Usuario)" | "Registro (Sistema)" | "Pasta Startup"
  location: string;   // "HKCU" | "HKLM" | "FOLDER"
  enabled: boolean;
  iconBase64?: string; // base64 PNG icon extracted from the exe
}

/** UTF-16LE → Base64 encoder for PowerShell -EncodedCommand */
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

const LIST_SCRIPT = `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Drawing

function Get-ApprovedState($regPath, $name) {
  try {
    $bytes = Get-ItemPropertyValue $regPath -Name $name -ErrorAction Stop
    if ($bytes[0] -eq 2 -or $bytes[0] -eq 6) { return $true }
    return $false
  } catch {
    return $true
  }
}

function Get-ExeIcon($cmd) {
  try {
    # Extract exe path from command (handles quotes and arguments)
    $exePath = $cmd -replace '^\\"','\"'
    if ($exePath -match '^"([^"]+)"') { $exePath = $Matches[1] }
    elseif ($exePath -match '^([^\\s]+\\.exe)') { $exePath = $Matches[1] }
    else { return '' }
    if (-not (Test-Path $exePath)) { return '' }
    $icon = [System.Drawing.Icon]::ExtractAssociatedIcon($exePath)
    if (-not $icon) { return '' }
    $bmp = $icon.ToBitmap()
    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $b64 = [Convert]::ToBase64String($ms.ToArray())
    $ms.Dispose(); $bmp.Dispose(); $icon.Dispose()
    return $b64
  } catch { return '' }
}

$items = [System.Collections.ArrayList]::new()

# HKCU Run
$hkcuPath = 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run'
$hkcuApproved = 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run'
if (Test-Path $hkcuPath) {
  $props = Get-ItemProperty $hkcuPath
  $props.PSObject.Properties | Where-Object { $_.Name -notin 'PSPath','PSParentPath','PSChildName','PSDrive','PSProvider' } | ForEach-Object {
    $enabled = Get-ApprovedState $hkcuApproved $_.Name
    $ico = Get-ExeIcon $_.Value
    [void]$items.Add(@{ name=$_.Name; command=$_.Value; source='Registro (Usuario)'; location='HKCU'; enabled=$enabled; iconBase64=$ico })
  }
}

# HKLM Run
$hklmPath = 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run'
$hklmApproved = 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run32'
if (Test-Path $hklmPath) {
  $props = Get-ItemProperty $hklmPath
  $props.PSObject.Properties | Where-Object { $_.Name -notin 'PSPath','PSParentPath','PSChildName','PSDrive','PSProvider' } | ForEach-Object {
    $enabled = Get-ApprovedState $hklmApproved $_.Name
    $ico = Get-ExeIcon $_.Value
    [void]$items.Add(@{ name=$_.Name; command=$_.Value; source='Registro (Sistema)'; location='HKLM'; enabled=$enabled; iconBase64=$ico })
  }
}

# Startup folder
$startupFolder = [Environment]::GetFolderPath('Startup')
if (Test-Path $startupFolder) {
  Get-ChildItem $startupFolder -File | ForEach-Object {
    $ico = Get-ExeIcon $_.FullName
    [void]$items.Add(@{ name=$_.BaseName; command=$_.FullName; source='Pasta Startup'; location='FOLDER'; enabled=$true; iconBase64=$ico })
  }
}

if ($items.Count -eq 0) { Write-Output '[]' }
else { $items | ConvertTo-Json -Compress }
`;

export function useStartupItems() {
  const [items, setItems] = useState<StartupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    if (!(window as any).__TAURI_INTERNALS__) {
      // Dev mode: show mock data
      setItems([
        { name: "Discord", command: "C:\\Users\\User\\AppData\\Local\\Discord\\Update.exe --processStart Discord.exe", source: "Registro (Usuario)", location: "HKCU", enabled: true },
        { name: "Steam", command: "\"C:\\Program Files (x86)\\Steam\\steam.exe\" /silent", source: "Registro (Usuario)", location: "HKCU", enabled: true },
        { name: "SecurityHealth", command: "C:\\Windows\\system32\\SecurityHealthSystray.exe", source: "Registro (Sistema)", location: "HKLM", enabled: true },
        { name: "RealTek Audio", command: "C:\\Program Files\\Realtek\\Audio\\HDA\\RAVCpl64.exe", source: "Registro (Sistema)", location: "HKLM", enabled: false },
      ]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const { Command } = await import("@tauri-apps/plugin-shell");
      const encoded = encodePS(LIST_SCRIPT);
      const cmd = Command.create("powershell", [
        "-NoProfile", "-ExecutionPolicy", "Bypass",
        "-EncodedCommand", encoded,
      ]);
      const output = await cmd.execute();
      const stdout = (output.stdout || "").trim();

      if (!stdout || stdout === "[]") {
        setItems([]);
      } else {
        const parsed = JSON.parse(stdout);
        // PowerShell returns a single object (not array) when there's only 1 item
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        setItems(arr.map((item: any) => ({
          name: item.name || "",
          command: item.command || "",
          source: item.source || "",
          location: item.location || "",
          enabled: item.enabled === true,
          iconBase64: item.iconBase64 || undefined,
        })));
      }
    } catch (err) {
      console.error("[Startup] Failed to load items:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const toggleItem = useCallback(async (item: StartupItem, enable: boolean) => {
    if (!(window as any).__TAURI_INTERNALS__) {
      setItems(prev => prev.map(i => i.name === item.name ? { ...i, enabled: enable } : i));
      return;
    }

    // Startup folder items can't be toggled via registry
    if (item.location === "FOLDER") return;

    const approvedPath = item.location === "HKCU"
      ? "HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run"
      : "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run32";

    const byteVal = enable ? 2 : 3;

    const script = `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
try {
  $path = '${approvedPath}'
  $name = '${item.name.replace(/'/g, "''")}'
  $bytes = Get-ItemPropertyValue $path -Name $name -ErrorAction Stop
  $bytes[0] = ${byteVal}
  Set-ItemProperty $path -Name $name -Value ([byte[]]$bytes)
  Write-Output 'OK'
} catch {
  # If no StartupApproved entry exists, create one
  $newBytes = [byte[]](${byteVal},0,0,0,0,0,0,0,0,0,0,0)
  New-ItemProperty -Path '${approvedPath}' -Name '${item.name.replace(/'/g, "''")}' -Value $newBytes -PropertyType Binary -Force | Out-Null
  Write-Output 'OK'
}`;

    try {
      const { Command } = await import("@tauri-apps/plugin-shell");
      const encoded = encodePS(script);

      let cmd;
      if (item.location === "HKLM") {
        // HKLM needs admin
        cmd = Command.create("powershell", [
          "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command",
          `Start-Process powershell -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-EncodedCommand','${encoded}' -Verb RunAs -Wait`,
        ]);
      } else {
        cmd = Command.create("powershell", [
          "-NoProfile", "-ExecutionPolicy", "Bypass",
          "-EncodedCommand", encoded,
        ]);
      }

      await cmd.execute();
      // Update state optimistically
      setItems(prev => prev.map(i => i.name === item.name && i.location === item.location ? { ...i, enabled: enable } : i));
    } catch (err) {
      console.error(`[Startup] Toggle failed for ${item.name}:`, err);
      throw err;
    }
  }, []);

  return { items, loading, error, reload: loadItems, toggleItem };
}
