/**
 * usePCInfo — Detects real hardware via PowerShell CIM instances.
 *
 * On Tauri: runs a PowerShell script that queries Win32_Processor,
 * Win32_VideoController, etc. and returns structured JSON.
 * On browser (dev): falls back to mock data from data/mocks.
 *
 * NVIDIA driver version is converted from WMI format (31.0.15.6081)
 * to the familiar NVIDIA format (560.81) by combining the last two
 * version groups and taking the final 5 digits → "560.81".
 */
import { useState, useEffect } from 'react';
import type { PCInfo } from '../types';
import { PC_INFO } from '../data';

// ── PowerShell system info script ──────────────────────────
const SYSINFO_SCRIPT = `
$cpu = Get-CimInstance Win32_Processor | Select-Object -First 1
$gpu = Get-CimInstance Win32_VideoController | Where-Object { $_.AdapterRAM -gt 0 } | Select-Object -First 1
$os = Get-CimInstance Win32_OperatingSystem
$cs = Get-CimInstance Win32_ComputerSystem
$mb = Get-CimInstance Win32_BaseBoard | Select-Object -First 1
$disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
$boot = $os.LastBootUpTime
$up = (Get-Date) - $boot
$mem = Get-CimInstance Win32_PhysicalMemory | Select-Object -First 1
$memType = if ($mem.SMBIOSMemoryType -eq 34) { 'DDR5' } elseif ($mem.SMBIOSMemoryType -eq 26) { 'DDR4' } else { 'DDR4' }
$baseMHz = $cpu.MaxClockSpeed
$boostMHz = $cpu.MaxClockSpeed
try { $perf = Get-CimInstance Win32_PerfFormattedData_Counters_ProcessorInformation -Filter "Name='_Total'" -ErrorAction SilentlyContinue; if ($perf.PercentofMaximumFrequency) { $boostMHz = [math]::Round($baseMHz * $perf.PercentofMaximumFrequency / 100) } } catch {}
$vram = if ($gpu.AdapterRAM -gt 0) { [math]::Round($gpu.AdapterRAM / 1GB) } else { 0 }
if ($vram -eq 0 -or $vram -gt 128) { $vram = 8 }
$nvDriver = 'N/A'
$driverRaw = $gpu.DriverVersion
if ($driverRaw) {
  $dp = $driverRaw -split '\\.'
  if ($dp.Count -ge 4) { $combo = $dp[-2] + $dp[-1]; $l5 = $combo.Substring($combo.Length - 5); $nvDriver = $l5.Substring(0,3) + '.' + $l5.Substring(3) }
}
$latestNv = ''
try { $page = Invoke-WebRequest -Uri 'https://www.nvidia.com/Download/driverResults.aspx/230208/en-us/' -UseBasicParsing -TimeoutSec 5; if ($page.Content -match '(\\d{3}\\.\\d{2})') { $latestNv = $Matches[1] } } catch {}
$result = @{
  hostname = $env:COMPUTERNAME
  user = $env:USERNAME
  os = $os.Caption -replace 'Microsoft ',''
  build = $os.Version
  cpu_model = $cpu.Name.Trim()
  cpu_cores = $cpu.NumberOfCores
  cpu_threads = $cpu.NumberOfLogicalProcessors
  cpu_base = [math]::Round($baseMHz / 1000, 1)
  cpu_boost = [math]::Round($boostMHz / 1000, 1)
  gpu_model = if ($gpu.Name) { $gpu.Name } else { 'Desconhecida' }
  gpu_vram = $vram
  gpu_driver = 'v' + $nvDriver
  gpu_latest = $latestNv
  ram_total = [math]::Round($cs.TotalPhysicalMemory / 1GB)
  ram_speed = if ($mem.Speed) { $mem.Speed } else { 0 }
  ram_type = $memType
  disk_total = [math]::Round($disk.Size / 1GB)
  disk_free = [math]::Round($disk.FreeSpace / 1GB)
  mobo = if ($mb.Product) { $mb.Product } else { 'Desconhecida' }
  uptime = '{0}d {1}h {2}m' -f $up.Days, $up.Hours, $up.Minutes
}
$result | ConvertTo-Json
`.trim();

/** Executes the PowerShell sysinfo script and parses the result into PCInfo. */
async function fetchPCInfo(): Promise<PCInfo | null> {
  if (!(window as any).__TAURI_INTERNALS__) return null;
  try {
    const { Command } = await import('@tauri-apps/plugin-shell');
    const cmd = Command.create('powershell', [
      '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', SYSINFO_SCRIPT,
    ]);
    const output = await cmd.execute();
    if (output.code !== 0) return null;
    const d = JSON.parse(output.stdout);
    return {
      hostname: d.hostname,
      user: d.user,
      os: d.os,
      build: d.build,
      cpu: { model: d.cpu_model, cores: d.cpu_cores, threads: d.cpu_threads, baseClock: d.cpu_base, boostClock: d.cpu_boost },
      gpu: {
        model: d.gpu_model, vram: d.gpu_vram, driver: d.gpu_driver,
        driverUpdateAvailable: !!(d.gpu_latest && d.gpu_latest !== d.gpu_driver?.replace('v', '')),
        latestDriver: d.gpu_latest ? `v${d.gpu_latest}` : '',
      },
      ram: { total: d.ram_total, type: d.ram_type, speed: d.ram_speed },
      disk: { letter: 'C', total: d.disk_total, free: d.disk_free, type: 'SSD' },
      mobo: d.mobo,
      uptime: d.uptime,
      bootTime: 'N/A',
    };
  } catch {
    return null;
  }
}

/**
 * Hook that fetches real PC hardware info on mount.
 * Falls back to mock data (PC_INFO) when not running inside Tauri.
 */
export function usePCInfo() {
  const [pcInfo, setPcInfo] = useState<PCInfo>(PC_INFO);
  const [pcLoading, setPcLoading] = useState(true);

  useEffect(() => {
    fetchPCInfo().then((info) => {
      if (info) setPcInfo(info);
      setPcLoading(false);
    });
  }, []);

  return { pcInfo, pcLoading };
}
