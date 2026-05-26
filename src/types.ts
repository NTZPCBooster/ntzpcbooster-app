export interface Optimization {
  id: string;
  category: 'gaming' | 'limpeza' | 'tweaks' | 'gpu';
  title: string;
  short: string;
  long: string;
  admin: boolean;
  risk: 'nenhum' | 'baixo' | 'medio';
  icon: string;
  script: string;
  undoScript?: string;
  runOnce?: boolean;
  /** If set, on Win11 the toggle is locked and this message is shown instead. */
  win11Note?: string;
  /** If set, shown as checkboxes in the confirmation dialog. User picks which to apply. */
  selectableList?: { label: string; value: string }[];
}

export interface CategoryInfo {
  id: string;
  label: string;
  short: string;
  count: number | null;
}

export interface PCInfo {
  hostname: string;
  user: string;
  os: string;
  build: string;
  cpu: { model: string; cores: number; threads: number; baseClock: number; boostClock: number };
  gpu: { model: string; vram: number; driver: string; driverUpdateAvailable: boolean; latestDriver: string };
  ram: { total: number; type: string; speed: number };
  disk: { letter: string; total: number; free: number; type: string };
  mobo: string;
  uptime: string;
  bootTime: string;
}

export interface HistoryEntry {
  id: number;
  title: string;
  time: string;
  delta: string;
  kind: string;
}
