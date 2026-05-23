/**
 * Mock / fallback data used when the app runs in the browser (dev mode)
 * instead of inside Tauri. In production, usePCInfo() replaces PC_INFO
 * with real hardware data.
 */
import type { PCInfo, HistoryEntry } from '../types';

export const PC_INFO: PCInfo = {
  hostname: 'DESKTOP-9F2K1L',
  user: 'Lucas',
  os: 'Windows 11 Pro',
  build: '23H2 · 22631.4317',
  cpu: { model: 'AMD Ryzen 7 5800X', cores: 8, threads: 16, baseClock: 3.8, boostClock: 4.7 },
  gpu: { model: 'NVIDIA GeForce RTX 3070', vram: 8, driver: 'v560.81', driverUpdateAvailable: true, latestDriver: 'v566.36' },
  ram: { total: 32, type: 'DDR4', speed: 3600 },
  disk: { letter: 'C', total: 512, free: 234, type: 'NVMe SSD' },
  mobo: 'B550 AORUS PRO',
  uptime: '4d 12h 33m',
  bootTime: '2.4s',
};

/** Empty by default — populated by real user actions. */
export const HISTORY: HistoryEntry[] = [];
