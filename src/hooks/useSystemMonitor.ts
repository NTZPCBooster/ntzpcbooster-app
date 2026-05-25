/**
 * useSystemMonitor — Real-time system metrics via PowerShell.
 *
 * Polls every 3 seconds for CPU %, RAM %, GPU %, temperatures,
 * disk I/O (MB/s), and network throughput (Mbps).
 *
 * On browser (dev mode) falls back to randomized mock data.
 */
import { useState, useEffect, useRef, useCallback } from 'react';

export interface SystemMetrics {
  cpu: number;        // % usage
  ram: number;        // % usage
  gpu: number;        // % usage
  cpuTemp: number;    // °C
  gpuTemp: number;    // °C
  diskRead: number;   // MB/s
  diskWrite: number;  // MB/s
  netDown: number;    // Mbps
  netUp: number;      // Mbps
}

export interface MonitorState {
  current: SystemMetrics;
  cpuSeries: number[];
  gpuSeries: number[];
  ramSeries: number[];
  diskSeries: number[];  // combined read+write MB/s
  netSeries: number[];   // combined down+up Mbps
}

const SERIES_LENGTH = 60;
const POLL_INTERVAL = 3000;

const EMPTY_METRICS: SystemMetrics = {
  cpu: 0, ram: 0, gpu: 0,
  cpuTemp: 0, gpuTemp: 0,
  diskRead: 0, diskWrite: 0,
  netDown: 0, netUp: 0,
};

// PowerShell script that gathers all metrics in one shot
const MONITOR_SCRIPT = `
$cpuLoad = 0
try { $cpuLoad = (Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average } catch {}
$os = Get-CimInstance Win32_OperatingSystem
$ramPct = [math]::Round(($os.TotalVisibleMemorySize - $os.FreePhysicalMemory) / $os.TotalVisibleMemorySize * 100)
$gpuUse = 0; $gpuTemp = 0
try {
  $nv = & 'nvidia-smi' '--query-gpu=utilization.gpu,temperature.gpu' '--format=csv,noheader,nounits' 2>$null
  if ($LASTEXITCODE -eq 0 -and $nv) { $p = $nv.Trim() -split ','; $gpuUse = [int]$p[0].Trim(); $gpuTemp = [int]$p[1].Trim() }
} catch {}
$cpuTemp = 0
try { $tz = Get-CimInstance MSAcpi_ThermalZoneTemperature -Namespace root/wmi -ErrorAction Stop | Select-Object -First 1; if ($tz) { $cpuTemp = [math]::Round(($tz.CurrentTemperature - 2732) / 10) } } catch {}
$dr = 0; $dw = 0
try {
  $perf = Get-CimInstance Win32_PerfFormattedData_PerfDisk_PhysicalDisk -Filter "Name='_Total'" -ErrorAction Stop
  $dr = [math]::Round($perf.DiskReadBytesPersec / 1MB, 1)
  $dw = [math]::Round($perf.DiskWriteBytesPersec / 1MB, 1)
} catch {}
$nd = 0; $nu = 0
try {
  $nics = Get-CimInstance Win32_PerfFormattedData_Tcpip_NetworkInterface -ErrorAction Stop
  foreach ($n in $nics) { $nd += $n.BytesReceivedPersec; $nu += $n.BytesSentPersec }
  $nd = [math]::Round($nd / 1MB * 8, 1)
  $nu = [math]::Round($nu / 1MB * 8, 1)
} catch {}
@{ cpu=[int]$cpuLoad; ram=[int]$ramPct; gpu=$gpuUse; cpuTemp=$cpuTemp; gpuTemp=$gpuTemp; diskRead=$dr; diskWrite=$dw; netDown=$nd; netUp=$nu } | ConvertTo-Json -Compress
`.trim();

function randomWobble(prev: number, min: number, max: number): number {
  const next = prev + (Math.random() - 0.5) * 12;
  return Math.max(min, Math.min(max, next));
}

function initSeries(length: number, base: number, min: number, max: number): number[] {
  const arr: number[] = [];
  let v = base;
  for (let i = 0; i < length; i++) {
    v = randomWobble(v, min, max);
    arr.push(v);
  }
  return arr;
}

export function useSystemMonitor(): MonitorState {
  const [state, setState] = useState<MonitorState>({
    current: EMPTY_METRICS,
    cpuSeries: initSeries(SERIES_LENGTH, 30, 5, 95),
    gpuSeries: initSeries(SERIES_LENGTH, 20, 5, 85),
    ramSeries: initSeries(SERIES_LENGTH, 50, 30, 80),
    diskSeries: initSeries(SERIES_LENGTH, 5, 0, 100),
    netSeries: initSeries(SERIES_LENGTH, 10, 0, 100),
  });

  const isTauri = useRef(!!(window as any).__TAURI_INTERNALS__);

  const fetchMetrics = useCallback(async (): Promise<SystemMetrics | null> => {
    if (!isTauri.current) return null;
    try {
      const { Command } = await import('@tauri-apps/plugin-shell');
      const cmd = Command.create('powershell', [
        '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', MONITOR_SCRIPT,
      ]);
      const output = await cmd.execute();
      if (output.code !== 0) return null;
      const d = JSON.parse(output.stdout);
      return {
        cpu: d.cpu ?? 0,
        ram: d.ram ?? 0,
        gpu: d.gpu ?? 0,
        cpuTemp: d.cpuTemp ?? 0,
        gpuTemp: d.gpuTemp ?? 0,
        diskRead: d.diskRead ?? 0,
        diskWrite: d.diskWrite ?? 0,
        netDown: d.netDown ?? 0,
        netUp: d.netUp ?? 0,
      };
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    let active = true;

    const poll = async () => {
      const metrics = await fetchMetrics();
      if (!active) return;

      setState(prev => {
        if (metrics) {
          return {
            current: metrics,
            cpuSeries: [...prev.cpuSeries.slice(1), metrics.cpu],
            gpuSeries: [...prev.gpuSeries.slice(1), metrics.gpu],
            ramSeries: [...prev.ramSeries.slice(1), metrics.ram],
            diskSeries: [...prev.diskSeries.slice(1), metrics.diskRead + metrics.diskWrite],
            netSeries: [...prev.netSeries.slice(1), metrics.netDown + metrics.netUp],
          };
        }
        // Dev/browser fallback: wobble random data
        const c = prev.current;
        const newMetrics: SystemMetrics = {
          cpu: Math.round(randomWobble(c.cpu || 35, 5, 95)),
          ram: Math.round(randomWobble(c.ram || 55, 30, 80)),
          gpu: Math.round(randomWobble(c.gpu || 25, 5, 85)),
          cpuTemp: Math.round(randomWobble(c.cpuTemp || 62, 40, 85)),
          gpuTemp: Math.round(randomWobble(c.gpuTemp || 55, 35, 80)),
          diskRead: Math.round(randomWobble(c.diskRead || 10, 0, 200) * 10) / 10,
          diskWrite: Math.round(randomWobble(c.diskWrite || 5, 0, 150) * 10) / 10,
          netDown: Math.round(randomWobble(c.netDown || 15, 0, 100) * 10) / 10,
          netUp: Math.round(randomWobble(c.netUp || 3, 0, 50) * 10) / 10,
        };
        return {
          current: newMetrics,
          cpuSeries: [...prev.cpuSeries.slice(1), newMetrics.cpu],
          gpuSeries: [...prev.gpuSeries.slice(1), newMetrics.gpu],
          ramSeries: [...prev.ramSeries.slice(1), newMetrics.ram],
          diskSeries: [...prev.diskSeries.slice(1), newMetrics.diskRead + newMetrics.diskWrite],
          netSeries: [...prev.netSeries.slice(1), newMetrics.netDown + newMetrics.netUp],
        };
      });
    };

    // Initial poll
    poll();
    const id = setInterval(poll, POLL_INTERVAL);
    return () => { active = false; clearInterval(id); };
  }, [fetchMetrics]);

  return state;
}
