import { useState } from "react";
import { Icon, Switch, Skeleton } from "./primitives";
import { useStartupItems } from "../hooks/useStartupItems";
import type { StartupItem } from "../hooks/useStartupItems";
import { useI18n } from "../i18n";

export function StartupPage() {
  const { t } = useI18n();
  const { items, loading, error, reload, toggleItem } = useStartupItems();
  const [toggling, setToggling] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [toast, setToast] = useState<{ msg: string; kind: string; id: number } | null>(null);

  const showToast = (msg: string, kind = "ok") => {
    setToast({ msg, kind, id: Date.now() });
    setTimeout(() => setToast(null), 2400);
  };

  const handleToggle = async (item: StartupItem, val: boolean) => {
    if (item.location === "FOLDER") {
      showToast(t('startup.folderError'), "error");
      return;
    }

    const key = `${item.location}:${item.name}`;
    setToggling(prev => new Set(prev).add(key));

    try {
      await toggleItem(item, val);
      showToast(t(val ? 'startup.enabled' : 'startup.disabled', { name: item.name }));
    } catch {
      showToast(t('startup.toggleError', { name: item.name }), "error");
    } finally {
      setToggling(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const enabledCount = items.filter(i => i.enabled).length;
  const inactiveCount = items.length - enabledCount;

  // Filtering
  const filtered = items.filter(item => {
    if (filter === "active" && !item.enabled) return false;
    if (filter === "inactive" && item.enabled) return false;
    if (filter === "system" && item.location !== "HKLM") return false;
    if (search && !(item.name + " " + item.command).toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <section className="optlist-page">
      <header className="optlist-page__head">
        <div>
          <div className="mono optlist-page__eyebrow">— {t('startup.sectionLabel')}</div>
          <h1 className="optlist-page__title">{t('startup.title')}</h1>
          <p className="optlist-page__sub">
            {t('startup.subtitle')}
          </p>
        </div>
        <div className="optlist-page__stats mono">
          <div>
            <div className="kv__k">{t('common.total')}</div>
            <div className="kv__big">{items.length.toString().padStart(2, "0")}</div>
          </div>
          <div>
            <div className="kv__k">{t('common.active')}</div>
            <div className="kv__big">{enabledCount.toString().padStart(2, "0")}</div>
          </div>
          <div>
            <div className="kv__k">{t('common.inactive')}</div>
            <div className="kv__big">{inactiveCount.toString().padStart(2, "0")}</div>
          </div>
        </div>
      </header>

      <div className="optlist-page__toolbar">
        <div className="search">
          <Icon name="search" size={14} />
          <input
            type="text"
            placeholder={t('startup.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filters mono">
          {[
            { id: "all", l: t('startup.filterAll') },
            { id: "active", l: t('startup.filterActive') },
            { id: "inactive", l: t('startup.filterInactive') },
            { id: "system", l: t('startup.filterSystem') },
          ].map(f => (
            <button
              key={f.id}
              className={`chip ${filter === f.id ? "is-on" : ""}`}
              onClick={() => setFilter(f.id)}
            >
              {f.l}
            </button>
          ))}
          <button className="chip" onClick={reload} title={t('startup.reload')}>
            <Icon name="refresh" size={12} />
          </button>
        </div>
      </div>

      {loading && (
        <ul className="optlist">
          {Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="optrow">
              <div className="optrow__main" style={{ cursor: 'default' }}>
                <div className="optrow__icon">
                  <Skeleton width={20} height={20} style={{ borderRadius: 3 }} />
                </div>
                <div className="optrow__text" style={{ flex: 1 }}>
                  <Skeleton height={13} width={`${55 + i * 8}%`} />
                  <Skeleton height={10} width={`${70 + i * 5}%`} style={{ marginTop: 6 }} />
                </div>
                <div className="optrow__action">
                  <Skeleton height={22} width={44} style={{ borderRadius: 11 }} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <div className="startup-empty mono">
          <Icon name="alert" size={24} />
          <span>{error}</span>
          <button className="btn btn--ghost btn--small" onClick={reload}>
            <Icon name="refresh" size={12} /> {t('startup.retry')}
          </button>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="startup-empty mono">
          <Icon name="check" size={24} />
          <span>{t('startup.empty')}</span>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <ul className="optlist">
          {filtered.map((item) => {
            const key = `${item.location}:${item.name}`;
            const isToggling = toggling.has(key);
            const isFolder = item.location === "FOLDER";

            return (
              <li
                key={key}
                className={`optrow ${item.enabled ? "is-applied" : ""} ${isToggling ? "is-running" : ""}`}
              >
                <div className="optrow__main">
                  <div className="optrow__icon">
                    {item.iconBase64 ? (
                      <img
                        src={`data:image/png;base64,${item.iconBase64}`}
                        alt=""
                        width={20}
                        height={20}
                        style={{ borderRadius: 3, objectFit: "contain" }}
                      />
                    ) : (
                      <Icon name="package" size={18} />
                    )}
                  </div>
                  <div className="optrow__text">
                    <div className="optrow__head">
                      <span className="optrow__title">{item.name}</span>
                      {item.location === "HKLM" && (
                        <span className="badge badge--admin mono">{t('common.system')}</span>
                      )}
                      <span className="badge badge--risk badge--risk-nenhum">
                        {item.source}
                      </span>
                    </div>
                    <div className="optrow__short">{item.command}</div>
                  </div>
                  <div className="optrow__action">
                    {isToggling ? (
                      <div className="optrow__spinner">
                        <div className="spinner" />
                        <span className="mono spinner-label">...</span>
                      </div>
                    ) : isFolder ? (
                      <span className="mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>{t('common.shortcut')}</span>
                    ) : (
                      <div className="optrow__switch">
                        <span className="mono switch-label">{item.enabled ? t('common.on') : t('common.off')}</span>
                        <Switch
                          on={item.enabled}
                          onChange={(val) => handleToggle(item, val)}
                          disabled={isToggling}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {!loading && filtered.length === 0 && items.length > 0 && (
        <ul className="optlist">
          <li className="optlist__empty mono">{t('common.noResults')}</li>
        </ul>
      )}

      {toast && (
        <div className={`toast toast--${toast.kind}`} key={toast.id}>
          <Icon name={toast.kind === "error" ? "alert" : "check"} size={14} />
          <span>{toast.msg}</span>
        </div>
      )}
    </section>
  );
}
