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

export const HISTORY: HistoryEntry[] = [
  { id: 1, title: 'Boost Completo',          time: 'ha 2 horas',  delta: '+18% FPS estimado',  kind: 'boost' },
  { id: 2, title: 'Limpar Cache de Shaders',  time: 'ha 5 horas',  delta: '420 MB liberados',   kind: 'limpeza' },
  { id: 3, title: 'Aceleracao de Mouse',      time: 'ontem',       delta: 'desativada',         kind: 'tweak' },
  { id: 4, title: 'Limpeza Completa',         time: 'ha 3 dias',   delta: '6.8 GB liberados',   kind: 'limpeza' },
  { id: 5, title: 'GPU Scheduling',           time: 'ha 1 semana', delta: 'ativado',            kind: 'gaming' },
];
