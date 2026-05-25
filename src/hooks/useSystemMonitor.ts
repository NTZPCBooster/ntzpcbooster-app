/**
 * useSystemMonitor — Real-time system metrics via PowerShell.
 *
 * Polls every 5 seconds for CPU %, RAM %, GPU %, temperatures,
 * disk I/O (MB/s), and network throughput (Mbps).
 *
 * Uses Win32_PerfFormattedData_PerfOS_Processor for CPU — same
 * counter as Task Manager — instead of Win32_Processor.LoadPercentage
 * which is known to be inaccurate.
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
const POLL_INTERVAL = 5000;

const EMPTY_METRICS: SystemMetrics = {
  cpu: 0, ram: 0, gpu: 0,
  cpuTemp: 0, gpuTemp: 0,
  diskRead: 0, diskWrite: 0,
  netDown: 0, netUp: 0,
};

// Lean PowerShell script — 4 lightweight WMI calls + nvidia-smi
// Uses PerfOS_Processor (same as Task Manager) instead of Win32_Processor.LoadPercentage
const MONITOR_SCRIPT = `
$c=[math]::Round((Get-CimInstance Win32_PerfFormattedData_PerfOS_Processor -Filter "Name='_Total'" -Property PercentProcessorTime).PercentProcessorTime)
$o=Get-CimInstance Win32_OperatingSystem -Property TotalVisibleMemorySize,FreePhysicalMemory
$r=[math]::Round(($o.TotalVisibleMemorySize-$o.FreePhysicalMemory)/$o.TotalVisibleMemorySize*100)
$g=0;$gt=0
try{$nv=&'nvidia-smi' '--query-gpu=utilization.gpu,temperature.gpu' '--format=csv,noheader,nounits' 2>$null;if($LASTEXITCODE-eq 0-and$nv){$p=$nv.Trim()-split',';$g=[int]$p[0].Trim();$gt=[int]$p[1].Trim()}}catch{}
$dr=0;$dw=0
try{$dk=Get-CimInstance Win32_PerfFormattedData_PerfDisk_PhysicalDisk -Filter "Name='_Total'" -Property DiskReadBytesPersec,DiskWriteBytesPersec -ErrorAction Stop;$dr=[math]::Round($dk.DiskReadBytesPersec/1MB,1);$dw=[math]::Round($dk.DiskWriteBytesPersec/1MB,1)}catch{}
$nd=0;$nu=0
try{Get-CimInstance Win32_PerfFormattedData_Tcpip_NetworkInterface -Property BytesReceivedPersec,BytesSentPersec -ErrorAction Stop|ForEach-Object{$nd+=$_.BytesReceivedPersec;$nu+=$_.BytesSentPersec};$nd=[math]::Round($nd/1MB*8,1);$nu=[math]::Round($nu/1MB*8,1)}catch{}
@{cpu=$c;ram=$r;gpu=$g;gpuTemp=$gt;diskRead=$dr;diskWrite=$dw;netDown=$nd;netUp=$nu}|ConvertTo-Json -Compress
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
  // Cache the shell module so we don't dynamic-import every poll
  const shellRef = useRef<any>(null);

  const fetchMetrics = useCallback(async (): Promise<SystemMetrics | null> => {
    if (!isTauri.current) return null;
    try {
      if (!shellRef.current) {
        shellRef.current = await import('@tauri-apps/plugin-shell');
      }
      const { Command } = shellRef.current;
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
        cpuTemp: 0, // removed CPU temp query (MSAcpi unreliable + heavy)
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
    let timeoutId: ReturnType<typeof setTimeout>;

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

      // Schedule next poll AFTER current one completes (avoids overlap)
      if (active) {
        timeoutId = setTimeout(poll, POLL_INTERVAL);
      }
    };

    // Initial poll
    poll();
    return () => { active = false; clearTimeout(timeoutId); };
  }, [fetchMetrics]);

  return state;
}
