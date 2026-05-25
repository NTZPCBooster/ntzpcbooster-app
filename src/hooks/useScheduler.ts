import { useEffect, useRef, useCallback } from 'react';
import { OPTIMIZATIONS } from '../data';

export interface SchedulerConfig {
  enabled: boolean;
  dayOfWeek: number; // 0=Domingo, 1=Segunda ... 6=Sábado
  time: string; // "HH:MM" (24h)
}

export const DEFAULT_SCHEDULER: SchedulerConfig = {
  enabled: false,
  dayOfWeek: 6, // Sábado
  time: '03:00',
};

/** IDs de limpeza que o agendamento executa (seguros, sem risco) */
const SCHEDULED_CLEANUP_IDS = [
  'temp-files',
  'prefetch',
  'browser-cache',
  'shader-cache',
  'dns-cache',
  'thumbnails',
  'winupdate-cache',
  'win-logs',
];

interface UseSchedulerOpts {
  config: SchedulerConfig;
  lastScheduledRun: string | null; // ISO date string of last scheduled execution
  onRun: (cleanupIds: string[]) => Promise<void>;
  onComplete: (lastRun: string) => void;
}

/**
 * Hook que verifica a cada 60s se está na hora de rodar a limpeza agendada.
 * Só dispara 1x por semana (compara com lastScheduledRun).
 */
export function useScheduler({ config, lastScheduledRun, onRun, onComplete }: UseSchedulerOpts) {
  const runningRef = useRef(false);

  const checkAndRun = useCallback(async () => {
    if (!config.enabled || runningRef.current) return;

    const now = new Date();
    const currentDay = now.getDay();
    const [hh, mm] = config.time.split(':').map(Number);

    // Não é o dia/hora certo
    if (currentDay !== config.dayOfWeek) return;
    if (now.getHours() < hh || (now.getHours() === hh && now.getMinutes() < mm)) return;

    // Já rodou pra esse horário agendado?
    // Compara com o horário configurado, não só a data — assim se o usuário
    // mudar o horário pra mais tarde no mesmo dia, roda de novo.
    if (lastScheduledRun) {
      const scheduledToday = new Date(now);
      scheduledToday.setHours(hh, mm, 0, 0);
      const lastDate = new Date(lastScheduledRun);
      if (lastDate >= scheduledToday) return;
    }

    // Hora de rodar!
    runningRef.current = true;
    try {
      const ids = SCHEDULED_CLEANUP_IDS.filter(id =>
        OPTIMIZATIONS.some(o => o.id === id)
      );
      await onRun(ids);
      onComplete(new Date().toISOString());
    } finally {
      runningRef.current = false;
    }
  }, [config, lastScheduledRun, onRun, onComplete]);

  useEffect(() => {
    if (!config.enabled) return;

    // Check immediately on mount/config change
    checkAndRun();

    // Then check every 60 seconds
    const interval = setInterval(checkAndRun, 60_000);
    return () => clearInterval(interval);
  }, [config, checkAndRun]);
}
