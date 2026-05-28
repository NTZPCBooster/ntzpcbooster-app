import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Sidebar } from "./components/Sidebar";
import { Hero } from "./components/hero";
import { OptList } from "./components/OptList";
import { HardwarePage } from "./components/HardwarePage";
import { HistoryPage } from "./components/HistoryPage";
import { AppearancePanel } from "./components/AppearancePanel";
import { SettingsPage } from "./components/SettingsPage";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { ActivationPage } from "./components/ActivationPage";
import { StartupPage } from "./components/StartupPage";
import { UpdateChecker } from "./components/UpdateChecker";
import { OnboardingWizard } from "./components/OnboardingWizard";
import { PageHints, resetHints } from "./components/PageHints";
import { Icon } from "./components/primitives";
import { OPTIMIZATIONS, CATEGORIES, HISTORY } from "./data";
import { usePCInfo } from "./hooks/usePCInfo";
import { useDetectState } from "./hooks/useDetectState";
import { useTrayClose } from "./hooks/useTrayClose";
import { useStartupItems } from "./hooks/useStartupItems";
import { useStorageInfo } from "./hooks/useStorageInfo";
import { useNotify } from "./hooks/useNotify";
import { useConfigIO } from "./hooks/useConfigIO";
import { useScheduler, DEFAULT_SCHEDULER } from "./hooks/useScheduler";
import type { SchedulerConfig } from "./hooks/useScheduler";
import { useAutostart } from "./hooks/useAutostart";
import { I18nProvider } from "./i18n";
import type { Locale } from "./i18n";
import { getLicense, checkStoredLicense } from "./lib/license";
import type { LicenseInfo } from "./lib/license";
import { STORAGE_KEY } from "./constants";
import type { PageId } from "./constants";
import type { Optimization, HistoryEntry } from "./types";

// ─────────────── PERSISTENCE HELPERS ───────────────
interface PersistedState {
  theme: "dark" | "light";
  accent: string;
  density: string;
  grid: boolean;
  minimizeToTray: boolean;
  locale: Locale;
  applied: Record<string, boolean>;
  history: HistoryEntry[];
  lastRan: Record<string, string>; // id → ISO timestamp of last execution
  scheduler: SchedulerConfig;
  lastScheduledRun: string | null; // ISO date of last scheduled cleanup
  onboardingDone: boolean;
}

function loadPersisted(): Partial<PersistedState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const state = JSON.parse(raw);
    // Migrate old "blue" accent to "green"
    if (state.accent === 'blue') state.accent = 'green';
    return state;
  } catch {
    return {};
  }
}

function savePersisted(state: PersistedState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* quota exceeded, ignore */ }
}

// ─────────────── APP ───────────────
function App() {
  // ── License gate ──
  const [licensed, setLicensed] = useState<boolean | null>(null); // null = checking
  const [_license, setLicense] = useState<LicenseInfo | null>(null);

  useEffect(() => {
    const stored = getLicense();
    if (!stored) {
      setLicensed(false);
      return;
    }
    // Validate with server before granting access
    setLicense(stored);
    checkStoredLicense().then(valid => {
      setLicensed(valid);
      if (!valid) setLicense(null);
    });
  }, []);

  // Load persisted state once
  const persisted = useRef(loadPersisted());

  const [current, setCurrent] = useState<PageId>("dashboard");
  const [theme, setTheme] = useState<"dark" | "light">(persisted.current.theme || "dark");
  const [accent, setAccent] = useState<string>(persisted.current.accent || "green");
  const [density, setDensity] = useState<string>(persisted.current.density || "cozy");
  const [grid, setGrid] = useState<boolean>(persisted.current.grid ?? true);
  const [minimizeToTray, setMinimizeToTray] = useState<boolean>(persisted.current.minimizeToTray ?? true);
  const [locale, setLocale] = useState<Locale>((persisted.current as any).locale || 'pt');
  const [showAppearance, setShowAppearance] = useState(false);
  const [applied, setApplied] = useState<Record<string, boolean>>(persisted.current.applied || {});
  const [toast, setToast] = useState<{ msg: string; kind: string; id: number } | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>(persisted.current.history || HISTORY);
  const [lastRan, setLastRan] = useState<Record<string, string>>(persisted.current.lastRan || {});
  const [scheduler, setScheduler] = useState<SchedulerConfig>(persisted.current.scheduler || DEFAULT_SCHEDULER);
  const [lastScheduledRun, setLastScheduledRun] = useState<string | null>(persisted.current.lastScheduledRun || null);
  const [onboardingDone, setOnboardingDone] = useState<boolean>(persisted.current.onboardingDone ?? false);

  // Loading / running states
  const [running, setRunning] = useState<Set<string>>(new Set());
  const [bulkRunning, setBulkRunning] = useState<string | null>(null); // 'boost' | 'clean' | null
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number; current: string } | null>(null);

  // Confirmation dialog for risky actions
  const [pendingConfirm, setPendingConfirm] = useState<{
    item: Optimization;
    action: 'toggle' | 'apply';
    value?: boolean;
  } | null>(null);

  // Dynamic PC info (from usePCInfo hook)
  const { pcInfo, pcLoading } = usePCInfo();

  // Startup items count for sidebar
  const { items: startupItems } = useStartupItems();

  // Real storage measurement for cleanup page
  const { sizes: storageSizes, totalMB: storageTotalMB, remeasure: remeasureStorage } = useStorageInfo();
  // Detect GPU brand for filtering GPU Boost items
  const gpuBrand = useMemo(() => {
    const model = pcInfo.gpu.model.toLowerCase();
    if (model.includes('nvidia') || model.includes('geforce') || model.includes('rtx') || model.includes('gtx')) return 'nvidia';
    if (model.includes('amd') || model.includes('radeon') || model.includes('rx ')) return 'amd';
    return 'unknown';
  }, [pcInfo.gpu.model]);

  const gpuItems = useMemo(() => {
    const all = OPTIMIZATIONS.filter((o) => o.category === 'gpu');
    if (gpuBrand === 'nvidia') return all.filter((o) => o.id.startsWith('nv-'));
    if (gpuBrand === 'amd') return all.filter((o) => o.id.startsWith('amd-'));
    return all; // unknown → show all
  }, [gpuBrand]);

  const dynamicCounts: Record<string, number> = {
    ...(startupItems.length > 0 ? { startup: startupItems.length } : {}),
    gpu: gpuItems.length,
  };

  // Native Windows toast notifications
  const notify = useNotify();

  // ── Helpers (defined before effects that reference them) ──
  const showToast = useCallback((msg: string, kind = "ok") => {
    setToast({ msg, kind, id: Date.now() });
    setTimeout(() => setToast(null), 2400);
  }, []);

  // ── Config export / import ──
  const handleConfigImported = useCallback((state: Record<string, unknown>) => {
    if (state.theme) setTheme(state.theme as "dark" | "light");
    if (state.accent) setAccent(state.accent as string);
    if (state.density) setDensity(state.density as string);
    if (state.grid != null) setGrid(state.grid as boolean);
    if (state.minimizeToTray != null) setMinimizeToTray(state.minimizeToTray as boolean);
    if (state.locale) setLocale(state.locale as Locale);
    if (state.applied) setApplied(state.applied as Record<string, boolean>);
    if (state.lastRan) setLastRan(state.lastRan as Record<string, string>);
    if (state.scheduler) setScheduler(state.scheduler as SchedulerConfig);
    if (state.lastScheduledRun !== undefined) setLastScheduledRun(state.lastScheduledRun as string | null);
    if (state.onboardingDone != null) setOnboardingDone(state.onboardingDone as boolean);
  }, []);
  const { exportConfig, importConfig } = useConfigIO(handleConfigImported, showToast);

  // Detect real system state (which optimizations are already applied)
  const { detected, detectLoading: _detectLoading, detectError } = useDetectState();
  const detectionApplied = useRef(false);
  useEffect(() => {
    if (detected && !detectionApplied.current) {
      detectionApplied.current = true;
      // Detection is the ground truth for toggle-able items.
      // Override localStorage values with real system state.
      setApplied(prev => ({ ...prev, ...detected }));
      const count = Object.keys(detected).length;
      const onCount = Object.values(detected).filter(Boolean).length;
      showToast(`Detecção: ${onCount}/${count} otimizações ativas`);
    }
  }, [detected, showToast]);
  // Show error toast if detection failed
  useEffect(() => {
    if (detectError && detectError !== 'no-tauri') {
      showToast(`Erro na detecção: ${detectError.slice(0, 80)}`, 'error');
    }
  }, [detectError, showToast]);

  // Autostart with Windows
  const autostart = useAutostart();

  // System tray: intercept close if user prefers minimize-to-tray
  useTrayClose(minimizeToTray);

  // Persist state on change
  useEffect(() => {
    savePersisted({ theme, accent, density, grid, minimizeToTray, locale, applied, history, lastRan, scheduler, lastScheduledRun, onboardingDone });
  }, [theme, accent, density, grid, minimizeToTray, locale, applied, history, lastRan, scheduler, lastScheduledRun, onboardingDone]);

  // Apply theme / accent / density / grid to root
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    root.setAttribute("data-grid", grid ? "on" : "off");
    root.setAttribute("data-density", density);
    if (accent === "green") {
      root.removeAttribute("data-accent");
    } else {
      root.setAttribute("data-accent", accent);
    }
  }, [theme, accent, density, grid]);

  const addHistory = useCallback((title: string, delta: string, kind: string) => {
    setHistory((prev) => [
      { id: Date.now(), title, time: "agora", delta, kind },
      ...prev,
    ]);
  }, []);

  // ── PowerShell Base64 encoder (UTF-16LE → Base64 for -EncodedCommand) ──
  // Avoids ALL argument-escaping issues between Tauri → Windows → PowerShell.
  function encodePS(script: string): string {
    const buf = new Uint8Array(script.length * 2);
    for (let i = 0; i < script.length; i++) {
      buf[i * 2] = script.charCodeAt(i) & 0xFF;
      buf[i * 2 + 1] = (script.charCodeAt(i) >> 8) & 0xFF;
    }
    let bin = "";
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    return btoa(bin);
  }

  // Execute a PowerShell script via Tauri
  const executeScript = useCallback(async (opt: Optimization, undo = false) => {
    const script = undo ? opt.undoScript : opt.script;
    if (!script) return;

    if ((window as any).__TAURI_INTERNALS__) {
      const { Command } = await import("@tauri-apps/plugin-shell");
      // Force UTF-8 output so Tauri (Rust) can decode stdout/stderr correctly.
      // Without this, Portuguese characters like ç/ã in "operação concluída"
      // cause "invalid utf-8 sequence" errors because Windows uses CP-1252.
      const utf8Script = `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8\n${script}`;
      const encoded = encodePS(utf8Script);

      let cmd;
      if (opt.admin) {
        // Admin scripts: Start-Process with RunAs for UAC elevation.
        cmd = Command.create("powershell", [
          "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command",
          `Start-Process powershell -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-EncodedCommand','${encoded}' -Verb RunAs -Wait`,
        ]);
      } else {
        // Non-admin scripts: run directly via EncodedCommand.
        // The app manifest (build.rs) sets requestedExecutionLevel = asInvoker
        // which disables UAC registry virtualization for this process.
        cmd = Command.create("powershell", [
          "-NoProfile", "-ExecutionPolicy", "Bypass",
          "-EncodedCommand", encoded,
        ]);
      }

      const output = await cmd.execute();
      console.log(`[PCBoost] ${opt.title} → code=${output.code} stdout=${output.stdout?.slice(0, 200)} stderr=${output.stderr?.slice(0, 200)}`);
      // Some commands (e.g. Clear-RecycleBin) write to stderr or return
      // non-zero even on success. Only throw when stderr contains a real
      // error *and* exit code is non-zero.
      const stderr = (output.stderr || "").trim();
      const isFalsePositive =
        !stderr ||
        stderr.includes("SilentlyContinue") ||
        stderr.includes("RecycleBin");
      if (output.code !== 0 && !isFalsePositive) throw new Error(stderr);
    } else {
      console.log(`[DEV] ${undo ? "Desfazendo" : "Executando"}: ${opt.title}`);
      console.log(`[DEV] Script: ${script}`);
      await new Promise((r) => setTimeout(r, 800));
    }
  }, []);

  // ── Actual execution (no risk check) ──
  const doToggle = useCallback(
    async (id: string, val: boolean) => {
      const item = OPTIMIZATIONS.find((o) => o.id === id);
      if (!item) return;
      setRunning((prev) => new Set(prev).add(id));
      try {
        await executeScript(item, !val);
        setApplied((prev) => ({ ...prev, [id]: val }));
        showToast(`${val ? "Aplicado" : "Desfeito"}: ${item.title}`);
        addHistory(item.title, val ? "ativado" : "desativado", item.category);
        notify("NTZ PCBooster", `${val ? "Ativado" : "Desativado"}: ${item.title}`);
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        showToast(`Erro: ${item.title} — ${detail.slice(0, 120)}`, "error");
        notify("Erro — NTZ PCBooster", `${item.title}: ${detail.slice(0, 80)}`);
      } finally {
        setRunning((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [executeScript, showToast, addHistory, notify]
  );

  const doApply = useCallback(
    async (id: string) => {
      const item = OPTIMIZATIONS.find((o) => o.id === id);
      if (!item) return;
      setRunning((prev) => new Set(prev).add(id));
      try {
        await executeScript(item);
        setApplied((prev) => ({ ...prev, [id]: true }));
        setLastRan((prev) => ({ ...prev, [id]: new Date().toISOString() }));
        showToast(`Executado: ${item.title}`);
        addHistory(item.title, "executado", item.category);
        notify("NTZ PCBooster", `Concluído: ${item.title}`);
        // Re-measure storage after cleanup
        if (item.category === "limpeza") remeasureStorage();
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        showToast(`Erro: ${item.title} — ${detail.slice(0, 120)}`, "error");
        notify("Erro — NTZ PCBooster", `${item.title}: ${detail.slice(0, 80)}`);
      } finally {
        setRunning((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [executeScript, showToast, addHistory, notify, remeasureStorage]
  );

  // ── Scheduled cleanup ──
  const scheduledCleanup = useCallback(async (ids: string[]) => {
    for (const id of ids) {
      const opt = OPTIMIZATIONS.find(o => o.id === id);
      if (!opt) continue;
      try {
        await executeScript(opt);
      } catch { /* continue on error */ }
    }
    const now = new Date().toISOString();
    setLastRan(prev => {
      const next = { ...prev };
      ids.forEach(id => { next[id] = now; });
      return next;
    });
    addHistory("Limpeza Agendada", "limpeza automática semanal", "limpeza");
    notify("NTZ PCBooster", "Limpeza agendada concluída — espaço liberado no disco.");
    remeasureStorage();
  }, [executeScript, addHistory, notify, remeasureStorage]);

  useScheduler({
    config: scheduler,
    lastScheduledRun,
    onRun: scheduledCleanup,
    onComplete: (iso) => setLastScheduledRun(iso),
  });

  // ── Public toggle/apply with risk confirmation ──
  const toggle = useCallback(
    (id: string, val: boolean) => {
      const item = OPTIMIZATIONS.find((o) => o.id === id);
      if (!item) return;
      if (item.risk === "medio" && val) {
        setPendingConfirm({ item, action: "toggle", value: val });
        return;
      }
      doToggle(id, val);
    },
    [doToggle]
  );

  const apply = useCallback(
    (id: string) => {
      const item = OPTIMIZATIONS.find((o) => o.id === id);
      if (!item) return;
      if (item.risk === "medio") {
        setPendingConfirm({ item, action: "apply" });
        return;
      }
      doApply(id);
    },
    [doApply]
  );

  const confirmPending = useCallback(async (selectedValues?: string[]) => {
    if (!pendingConfirm) return;
    const { item, action, value } = pendingConfirm;
    setPendingConfirm(null);

    // If selectableList was shown, build a custom script from user selection
    if (selectedValues && item.selectableList) {
      const appsList = selectedValues.map(v => `'${v}'`).join(',');
      const customScript = `$apps = @(${appsList}); foreach ($a in $apps) { Get-AppxPackage -Name $a -AllUsers -ErrorAction SilentlyContinue | Remove-AppxPackage -AllUsers -ErrorAction SilentlyContinue }`;
      const customItem = { ...item, script: customScript };
      setRunning(prev => new Set(prev).add(item.id));
      try {
        await executeScript(customItem);
        setApplied(prev => ({ ...prev, [item.id]: true }));
        setLastRan(prev => ({ ...prev, [item.id]: new Date().toISOString() }));
        showToast(`Executado: ${item.title} (${selectedValues.length} apps)`);
        addHistory(item.title, `${selectedValues.length} apps removidos`, item.category);
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        showToast(`Erro: ${item.title} — ${detail.slice(0, 120)}`, "error");
      } finally {
        setRunning(prev => { const next = new Set(prev); next.delete(item.id); return next; });
      }
      return;
    }

    if (action === "toggle") {
      doToggle(item.id, value!);
    } else {
      doApply(item.id);
    }
  }, [pendingConfirm, doToggle, doApply, executeScript, showToast, addHistory]);

  // ── One-click bulk with progress ──
  const runOneClick = useCallback(
    async (kind: string) => {
      setBulkRunning(kind);
      if (kind === "boost") {
        const opts = OPTIMIZATIONS.filter(
          (o) => o.category === "gaming" && !o.runOnce
        );
        for (let i = 0; i < opts.length; i++) {
          const opt = opts[i];
          setBulkProgress({ done: i, total: opts.length, current: opt.title });
          setRunning((prev) => new Set(prev).add(opt.id));
          try {
            await executeScript(opt);
          } catch {
            /* continue */
          }
          setRunning((prev) => {
            const next = new Set(prev);
            next.delete(opt.id);
            return next;
          });
        }
        const next: Record<string, boolean> = { ...applied };
        opts.forEach((o) => {
          next[o.id] = true;
        });
        setApplied(next);
        showToast("Boost completo aplicado");
        addHistory("Boost Completo", "+14 no score estimado", "gaming");
        notify("NTZ PCBooster", "Boost completo aplicado — todas as otimizações de gaming ativas.");
      } else {
        const SKIP_AUTO_CLEAN = ['bloatware', 'remove-onedrive'];
        const opts = OPTIMIZATIONS.filter((o) => o.category === "limpeza" && !SKIP_AUTO_CLEAN.includes(o.id));
        for (let i = 0; i < opts.length; i++) {
          const opt = opts[i];
          setBulkProgress({ done: i, total: opts.length, current: opt.title });
          setRunning((prev) => new Set(prev).add(opt.id));
          try {
            await executeScript(opt);
          } catch {
            /* continue */
          }
          setRunning((prev) => {
            const next = new Set(prev);
            next.delete(opt.id);
            return next;
          });
        }
        const now = new Date().toISOString();
        setLastRan((prev) => {
          const next = { ...prev };
          opts.forEach((o) => { next[o.id] = now; });
          return next;
        });
        showToast("Limpeza completa concluída");
        addHistory("Limpeza Completa", "espaço liberado", "limpeza");
        notify("NTZ PCBooster", "Limpeza completa concluída — espaço liberado no disco.");
        remeasureStorage();
      }
      setBulkRunning(null);
      setBulkProgress(null);
    },
    [applied, executeScript, showToast, addHistory, notify, remeasureStorage]
  );

  // ── Bulk toggle for category (enable all / disable all) ──
  const handleBulkToggle = useCallback(
    async (category: string, enable: boolean) => {
      const opts = OPTIMIZATIONS.filter(
        (o) => o.category === category && !o.runOnce
      );
      const targets = enable
        ? opts.filter((o) => !applied[o.id])   // only activate those that are off
        : opts.filter((o) => applied[o.id]);    // only deactivate those that are on

      if (targets.length === 0) return;

      setBulkRunning(category);
      const succeeded: string[] = [];

      for (let i = 0; i < targets.length; i++) {
        const opt = targets[i];
        setBulkProgress({ done: i, total: targets.length, current: opt.title });
        setRunning((prev) => new Set(prev).add(opt.id));

        try {
          // enable=true  → undo=false → runs opt.script
          // enable=false → undo=true  → runs opt.undoScript
          await executeScript(opt, !enable);
          succeeded.push(opt.id);
          // Update applied state immediately per item so UI reflects progress
          setApplied((prev) => ({ ...prev, [opt.id]: enable }));
        } catch (err) {
          const detail = err instanceof Error ? err.message : String(err);
          console.warn(`[BulkToggle] Erro em ${opt.title}: ${detail}`);
          /* continue on error */
        }

        setRunning((prev) => {
          const next = new Set(prev);
          next.delete(opt.id);
          return next;
        });
      }

      const action = enable ? "ativadas" : "desativadas";
      showToast(`${succeeded.length}/${targets.length} otimizações ${action}`);
      notify("NTZ PCBooster", `${succeeded.length}/${targets.length} otimizações ${action}.`);
      addHistory(
        `${enable ? 'Ativar' : 'Desativar'} todos — ${category}`,
        `${succeeded.length} itens ${action}`,
        category,
      );
      setBulkRunning(null);
      setBulkProgress(null);
    },
    [applied, executeScript, showToast, addHistory, notify]
  );

  // Performance score based on applied optimizations
  const score = useMemo(() => {
    let base = 72;
    const gamingOn = OPTIMIZATIONS.filter(
      (o) => o.category === "gaming" && applied[o.id]
    ).length;
    const tweaksOn = OPTIMIZATIONS.filter(
      (o) => o.category === "tweaks" && applied[o.id]
    ).length;
    return Math.min(100, Math.round(base + gamingOn * 1.2 + tweaksOn * 0.6));
  }, [applied]);

  const isWin11 = pcInfo.os.toLowerCase().includes('11');

  function renderMain() {
    switch (current) {
      case "dashboard":
        return (
          <Hero
            pc={pcInfo}
            pcLoading={pcLoading}
            score={score}
            onNav={(id: string) => setCurrent(id as PageId)}
            onRunOneClick={runOneClick}
            history={history}
            bulkRunning={bulkRunning}
            bulkProgress={bulkProgress}
            applied={applied}
            storageTotalMB={storageTotalMB}
          />
        );
      case "gaming":
        return (
          <OptList
            category="gaming"
            code="A"
            title="Gaming Boost"
            subtitle="Ajustes que tiram peso do Windows e dão mais FPS pros jogos. Reversível."
            items={OPTIMIZATIONS.filter((o) => o.category === "gaming")}
            applied={applied}
            onToggle={toggle}
            onApply={apply}
            onBulkToggle={(enable) => handleBulkToggle("gaming", enable)}
            running={running}
            bulkRunning={bulkRunning === "gaming"}
            isWin11={isWin11}
          />
        );
      case "gpu": {
        const gpuLabel = gpuBrand === 'nvidia' ? 'NVIDIA' : gpuBrand === 'amd' ? 'AMD' : 'NVIDIA / AMD';
        return (
          <OptList
            category="gpu"
            code="G"
            title={`GPU Boost — ${gpuLabel}`}
            subtitle={`Otimizações de driver ${gpuLabel}. Ajustam configurações globais da GPU pra máximo desempenho em jogos.`}
            items={gpuItems}
            applied={applied}
            onToggle={toggle}
            onApply={apply}
            onBulkToggle={(enable) => handleBulkToggle("gpu", enable)}
            running={running}
            bulkRunning={bulkRunning === "gpu"}
          />
        );
      }
      case "limpeza":
        return (
          <OptList
            category="limpeza"
            code="B"
            title="Limpeza"
            subtitle="Rotinas de faxina. Cada uma libera espaço sem mexer em arquivos pessoais."
            items={OPTIMIZATIONS.filter((o) => o.category === "limpeza")}
            applied={applied}
            onToggle={toggle}
            onApply={apply}
            onBulkToggle={(enable) => handleBulkToggle("limpeza", enable)}
            running={running}
            bulkRunning={bulkRunning === "limpeza"}
            lastRan={lastRan}
            storageSizes={storageSizes}
            storageTotalMB={storageTotalMB}
          />
        );
      case "tweaks":
        return (
          <OptList
            category="tweaks"
            code="C"
            title="Tweaks de Sistema"
            subtitle="Ajustes visuais e de privacidade. Não mexem em performance — só deixam o Windows do seu jeito."
            items={OPTIMIZATIONS.filter((o) => o.category === "tweaks")}
            applied={applied}
            onToggle={toggle}
            onApply={apply}
            onBulkToggle={(enable) => handleBulkToggle("tweaks", enable)}
            running={running}
            bulkRunning={bulkRunning === "tweaks"}
            isWin11={isWin11}
          />
        );
      case "startup":
        return <StartupPage />;
      case "hardware":
        return <HardwarePage pc={pcInfo} loading={pcLoading} />;
      case "historico":
        return <HistoryPage history={history} />;
      case "settings":
        return (
          <SettingsPage
            locale={locale}
            onLocaleChange={setLocale}
            minimizeToTray={minimizeToTray}
            onMinimizeToTrayChange={setMinimizeToTray}
            startWithWindows={autostart.enabled}
            startWithWindowsLoading={autostart.loading}
            onStartWithWindowsChange={autostart.toggle}
            scheduler={scheduler}
            onSchedulerChange={setScheduler}
            lastScheduledRun={lastScheduledRun}
            onExport={exportConfig}
            onImport={importConfig}
            onResetTutorial={() => { setOnboardingDone(false); resetHints(); }}
          />
        );
      default:
        return null;
    }
  }

  const currentLabel =
    current === 'settings' ? 'Configurações' : (CATEGORIES.find((c) => c.id === current)?.label || "Painel");

  // ── License gate render ──
  if (licensed === null) {
    return (
      <I18nProvider locale={locale}>
        <div className="activation">
          <div className="activation__bg" />
          <div className="activation__loading mono">Verificando licenca...</div>
        </div>
      </I18nProvider>
    );
  }

  if (!licensed) {
    return (
      <I18nProvider locale={locale}>
        <ActivationPage
          onActivated={(lic) => {
            setLicense(lic);
            setLicensed(true);
          }}
        />
      </I18nProvider>
    );
  }

  return (
    <I18nProvider locale={locale}>
    <div className="shell">
      <div className="shell__grid" aria-hidden="true" />
      <Sidebar
        current={current}
        onNav={(id: string) => setCurrent(id as PageId)}
        theme={theme}
        onThemeChange={(t: string) => setTheme(t as "dark" | "light")}
        onOpenAppearance={() => setShowAppearance(true)}
        dynamicCounts={dynamicCounts}
      />

      <main className="main">
        <div className="main__topbar">
          <div className="crumbs mono">
            <span className="crumbs__home">PCBOOST</span>
            <span className="crumbs__sep">/</span>
            <span className="crumbs__cur">{currentLabel}</span>
          </div>
          <div className="main__topbar-right">
            <div className="oschip mono">
              <span className="oschip__dot" />
              {pcInfo.os} · {pcInfo.build.split(" ·")[0]}
            </div>
            <div className="oschip mono">
              <Icon name="clock" size={12} /> {pcInfo.uptime}
            </div>
          </div>
        </div>

        <UpdateChecker />

        <div className="main__content">{renderMain()}</div>

        <footer className="main__foot mono">
          <span>— FIM DO DOCUMENTO</span>
          <span>·</span>
          <span>PCBOOST · v{__APP_VERSION__} · ESCALA 1:1</span>
        </footer>
      </main>

      {toast && (
        <div className={`toast toast--${toast.kind}`} key={toast.id}>
          <Icon name={toast.kind === "error" ? "alert" : "check"} size={14} />
          <span>{toast.msg}</span>
        </div>
      )}

      <AppearancePanel
        open={showAppearance}
        onClose={() => setShowAppearance(false)}
        theme={theme}
        onThemeChange={(t) => setTheme(t as "dark" | "light")}
        accent={accent}
        onAccentChange={setAccent}
        density={density}
        onDensityChange={setDensity}
        grid={grid}
        onGridChange={setGrid}
      />

      <ConfirmDialog
        open={!!pendingConfirm}
        title={pendingConfirm?.item.title || ""}
        description={pendingConfirm?.item.long || ""}
        risk={pendingConfirm?.item.risk || "medio"}
        selectableList={pendingConfirm?.item.selectableList}
        onConfirm={confirmPending}
        onCancel={() => setPendingConfirm(null)}
      />

      {!onboardingDone && (
        <OnboardingWizard onComplete={() => setOnboardingDone(true)} />
      )}

      <PageHints pageId={current} />
    </div>
    </I18nProvider>
  );
}

export default App;
