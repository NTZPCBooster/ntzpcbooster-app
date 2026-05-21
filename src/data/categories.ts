/** Sidebar navigation entries — count is derived from OPTIMIZATIONS at import time. */
import type { CategoryInfo } from '../types';
import { OPTIMIZATIONS } from './optimizations';

export const CATEGORIES: CategoryInfo[] = [
  { id: 'dashboard', label: 'Painel',       short: 'home',     count: null },
  { id: 'gaming',    label: 'Gaming Boost',  short: 'gamepad',  count: OPTIMIZATIONS.filter(o => o.category === 'gaming').length },
  { id: 'limpeza',   label: 'Limpeza',       short: 'trash',    count: OPTIMIZATIONS.filter(o => o.category === 'limpeza').length },
  { id: 'tweaks',    label: 'Tweaks',        short: 'sliders',  count: OPTIMIZATIONS.filter(o => o.category === 'tweaks').length },
  { id: 'hardware',  label: 'Hardware',      short: 'cpu',      count: null },
  { id: 'historico', label: 'Historico',      short: 'clock',    count: null },
];
