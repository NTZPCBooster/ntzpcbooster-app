import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Sidebar } from "./components/Sidebar";
import { Hero } from "./components/hero";
import { OptList } from "./components/OptList";
import { HardwarePage } from "./components/HardwarePage";
import { HistoryPage } from "./components/HistoryPage";
import { AppearancePanel } from "./components/AppearancePanel";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { Icon } from "./components/primitives";
import { OPTIMIZATIONS, CATEGORIES, HISTORY } from "./data";
import { usePCInfo } from "./hooks/usePCInfo";
import { STORAGE_KEY } from "./constants";
import type { PageId } from "./constants";
import type { Optimization, HistoryEntry } from "./types";

// ─────────────── PERSISTENCE HELPERS ───────────────
interface PersistedState {
  theme: "dark" | "light";
  accent: string;
  density: string;
  grid: boolean;
  applied: Record<string, boolean>;
  history: HistoryEntry[];
  lastRan: Record<string, string>; // id → ISO timestamp of last execution
}

function loadPersisted(): Partial<PersistedState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
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
  // Load persisted state once
  const persisted = useRef(loadPersisted());

  const [current, setCurrent] = useState<PageId>("dashboard");
  const [theme, setTheme] = useState<"dark" | "light">(persisted.current.theme || "dark");
  const [accent, setAccent] = useState<string>(persisted.current.accent || "blue");
  const [density, setDensity] = useState<string>(persisted.current.density || "cozy");
  const [grid, setGrid] = useState<boolean>(persisted.current.grid ?? true);
  const [showAppearance, setShowAppearance] = useState(false);
  const [applied, setApplied] = useState<Record<string, boolean>>(persisted.current.applied || {});
  const [toast, setToast] = useState<{ msg: string; kind: string; id: number } | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>(persisted.current.history || HISTORY);
  const [lastRan, setLastRan] = useState<Record<string, string>>(persisted.current.lastRan || {});

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

  // Persist state on change
  useEffect(() => {
    savePersisted({ theme, accent, density, grid, applied, history, lastRan });
  }, [theme, accent, density, grid, applied, history, lastRan]);

  // Apply theme / accent / density / grid to root
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    root.setAttribute("data-grid", grid ? "on" : "off");
    root.setAttribute("data-density", density);
    if (accent === "blue") {
      root.removeAttribute("data-accent");
    } else {
      root.setAttribute("data-accent", accent);
    }
  }, [theme, accent, density, grid]);

  const showToast = useCallback((msg: string, kind = "ok") => {
    setToast({ msg, kind, id: Date.now() });
    setTimeout(() => setToast(null), 2400);
  }, []);

  const addHistory = useCallback((title: string, delta: string, kind: string) => {
    setHistory((prev) => [
      { id: Date.now(), title, time: "agora", delta, kind },
      ...prev,
    ]);
  }, []);

  // Execute a PowerShell script via Tauri
  const executeScript = useCallback(async (opt: Optimization, undo = false) => {
    const script = undo ? opt.undoScript : opt.script;
    if (!script) return;

    if ((window as any).__TAURI_INTERNALS__) {
      const { Command } = await import("@tauri-apps/plugin-shell");
      const cmd = opt.admin
        ? Command.create("powershell", [
            "-Command",
            `Start-Process powershell -ArgumentList '-NoProfile -ExecutionPolicy Bypass -Command "${script}"' -Verb RunAs -Wait`,
          ])
        : Command.create("powershell", [
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            script,
          ]);
      const output = await cmd.execute();
      if (output.code !== 0) throw new Error(output.stderr);
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
      } catch {
        showToast(`Erro ao ${val ? "aplicar" : "desfazer"}: ${item.title}`, "error");
      } finally {
        setRunning((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [executeScript, showToast, addHistory]
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
      } catch {
        showToast(`Erro ao executar: ${item.title}`, "error");
      } finally {
        setRunning((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [executeScript, showToast, addHistory]
  );

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

  const confirmPending = useCallback(() => {
    if (!pendingConfirm) return;
    const { item, action, value } = pendingConfirm;
    setPendingConfirm(null);
    if (action === "toggle") {
      doToggle(item.id, value!);
    } else {
      doApply(item.id);
    }
  }, [pendingConfirm, doToggle, doApply]);

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
      } else {
        const opts = OPTIMIZATIONS.filter((o) => o.category === "limpeza");
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
      }
      setBulkRunning(null);
      setBulkProgress(null);
    },
    [applied, executeScript, showToast, addHistory]
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
            running={running}
          />
        );
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
            running={running}
            lastRan={lastRan}
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
            running={running}
          />
        );
      case "hardware":
        return <HardwarePage pc={pcInfo} loading={pcLoading} />;
      case "historico":
        return <HistoryPage history={history} />;
      default:
        return null;
    }
  }

  const currentLabel =
    CATEGORIES.find((c) => c.id === current)?.label || "Painel";

  return (
    <div className="shell">
      <div className="shell__grid" aria-hidden="true" />
      <Sidebar
        current={current}
        onNav={(id: string) => setCurrent(id as PageId)}
        theme={theme}
        onThemeChange={(t: string) => setTheme(t as "dark" | "light")}
        onOpenAppearance={() => setShowAppearance(true)}
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

        <div className="main__content">{renderMain()}</div>

        <footer className="main__foot mono">
          <span>— FIM DO DOCUMENTO</span>
          <span>·</span>
          <span>PCBOOST · REV.04 · ESCALA 1:1</span>
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
        onConfirm={confirmPending}
        onCancel={() => setPendingConfirm(null)}
      />
    </div>
  );
}

export default App;
