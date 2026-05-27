import { useState, useEffect, useCallback, useRef } from "react";
import { Icon } from "./primitives";
import { useI18n } from "../i18n";

const HINTS_STORAGE_KEY = "pcboost_hints_seen";

/* ─── Tour step definition ─── */
interface TourStep {
  /** CSS selector for the element to spotlight */
  selector: string;
  /** i18n key for title */
  titleKey: string;
  /** i18n key for description */
  descKey: string;
  /** Icon name */
  icon: string;
  /** Preferred tooltip position relative to the spotlighted element */
  position?: "top" | "bottom" | "left" | "right";
  /** Padding around the spotlight cutout */
  padding?: number;
}

/* ─── Tours per page ─── */
const PAGE_TOURS: Record<string, TourStep[]> = {
  dashboard: [
    {
      selector: ".hero__score-main",
      titleKey: "tour.dashboard.score.title",
      descKey: "tour.dashboard.score.desc",
      icon: "gauge",
      position: "bottom",
      padding: 8,
    },
    {
      selector: ".oneclick__card--boost",
      titleKey: "tour.dashboard.boost.title",
      descKey: "tour.dashboard.boost.desc",
      icon: "rocket",
      position: "bottom",
      padding: 8,
    },
    {
      selector: ".oneclick__card--clean",
      titleKey: "tour.dashboard.clean.title",
      descKey: "tour.dashboard.clean.desc",
      icon: "trash",
      position: "bottom",
      padding: 8,
    },
    {
      selector: ".hero__stats",
      titleKey: "tour.dashboard.realtime.title",
      descKey: "tour.dashboard.realtime.desc",
      icon: "monitor",
      position: "bottom",
      padding: 8,
    },
    {
      selector: ".quickjump",
      titleKey: "tour.dashboard.shortcuts.title",
      descKey: "tour.dashboard.shortcuts.desc",
      icon: "compass",
      position: "top",
      padding: 8,
    },
  ],
  gaming: [
    {
      selector: ".optrow:first-child .optrow__main",
      titleKey: "tour.gaming.row.title",
      descKey: "tour.gaming.row.desc",
      icon: "gamepad",
      position: "bottom",
      padding: 4,
    },
    {
      selector: ".optrow:first-child .optrow__expand",
      titleKey: "tour.gaming.expand.title",
      descKey: "tour.gaming.expand.desc",
      icon: "plus",
      position: "left",
      padding: 6,
    },
    {
      selector: ".optrow:first-child .optrow__action",
      titleKey: "tour.gaming.switch.title",
      descKey: "tour.gaming.switch.desc",
      icon: "power",
      position: "left",
      padding: 6,
    },
    {
      selector: ".optlist-page__bulk",
      titleKey: "tour.gaming.bulk.title",
      descKey: "tour.gaming.bulk.desc",
      icon: "check",
      position: "bottom",
      padding: 6,
    },
    {
      selector: ".optlist-page__toolbar",
      titleKey: "tour.gaming.toolbar.title",
      descKey: "tour.gaming.toolbar.desc",
      icon: "filter",
      position: "bottom",
      padding: 6,
    },
  ],
  gpu: [
    {
      selector: ".optrow:first-child",
      titleKey: "tour.gpu.row.title",
      descKey: "tour.gpu.row.desc",
      icon: "monitor",
      position: "bottom",
      padding: 4,
    },
    {
      selector: ".optrow:first-child .optrow__action",
      titleKey: "tour.gpu.undo.title",
      descKey: "tour.gpu.undo.desc",
      icon: "refresh",
      position: "left",
      padding: 6,
    },
  ],
  tweaks: [
    {
      selector: ".optrow:first-child .optrow__main",
      titleKey: "tour.tweaks.row.title",
      descKey: "tour.tweaks.row.desc",
      icon: "sliders",
      position: "bottom",
      padding: 4,
    },
    {
      selector: ".optrow:first-child .optrow__action",
      titleKey: "tour.tweaks.toggle.title",
      descKey: "tour.tweaks.toggle.desc",
      icon: "power",
      position: "left",
      padding: 6,
    },
    {
      selector: ".optlist-page__toolbar",
      titleKey: "tour.tweaks.toolbar.title",
      descKey: "tour.tweaks.toolbar.desc",
      icon: "filter",
      position: "bottom",
      padding: 6,
    },
  ],
  limpeza: [
    {
      selector: ".optrow:first-child",
      titleKey: "tour.limpeza.row.title",
      descKey: "tour.limpeza.row.desc",
      icon: "trash",
      position: "bottom",
      padding: 4,
    },
  ],
  startup: [
    {
      selector: ".optlist-page__toolbar",
      titleKey: "tour.startup.toolbar.title",
      descKey: "tour.startup.toolbar.desc",
      icon: "search",
      position: "bottom",
      padding: 8,
    },
    {
      selector: ".optlist",
      titleKey: "tour.startup.list.title",
      descKey: "tour.startup.list.desc",
      icon: "power",
      position: "top",
      padding: 8,
    },
  ],
  settings: [
    {
      selector: ".settings-page__frame",
      titleKey: "tour.settings.overview.title",
      descKey: "tour.settings.overview.desc",
      icon: "cog",
      position: "top",
      padding: 8,
    },
  ],
};

/* ─── Persistence helpers ─── */
function getSeenPages(): Set<string> {
  try {
    const raw = localStorage.getItem(HINTS_STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function markPageSeen(pageId: string) {
  const seen = getSeenPages();
  seen.add(pageId);
  localStorage.setItem(HINTS_STORAGE_KEY, JSON.stringify([...seen]));
}

export function resetHints() {
  localStorage.removeItem(HINTS_STORAGE_KEY);
}

/* ─── Rect calculation ─── */
interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function getElementRect(selector: string, padding = 8): SpotlightRect | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;
  return {
    top: rect.top - padding,
    left: rect.left - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  };
}

/* ─── Scroll element into view (handles .main scroll container) ─── */
function scrollToElement(selector: string): Promise<void> {
  return new Promise((resolve) => {
    const el = document.querySelector(selector);
    if (!el) {
      resolve();
      return;
    }

    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight;
    const margin = 80;

    const inView =
      rect.top >= margin &&
      rect.bottom <= vh - margin;

    if (inView) {
      resolve();
      return;
    }

    // Find the closest scrollable ancestor (.main or window)
    const scrollParent = el.closest(".main") || undefined;
    if (scrollParent) {
      // Use scrollIntoView which handles nested scroll containers
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    // Wait for smooth scroll to settle
    setTimeout(resolve, 500);
  });
}

/* ─── Tooltip position — always clamped to viewport ─── */
const TOOLTIP_W = 320;
const TOOLTIP_H_EST = 170; // estimated max height
const EDGE = 12; // minimum gap from viewport edge

function getTooltipStyle(
  rect: SpotlightRect,
  preferredPos: "top" | "bottom" | "left" | "right"
): React.CSSProperties {
  const gap = 14;
  const vh = window.innerHeight;
  const vw = window.innerWidth;

  // Space available in each direction
  const spaceTop = rect.top - gap;
  const spaceBottom = vh - (rect.top + rect.height) - gap;
  const spaceLeft = rect.left - gap;
  const spaceRight = vw - (rect.left + rect.width) - gap;

  // Pick position: use preferred if it fits, otherwise pick the side with most space
  let pos = preferredPos;
  const fitsTop = spaceTop >= TOOLTIP_H_EST;
  const fitsBottom = spaceBottom >= TOOLTIP_H_EST;
  const fitsLeft = spaceLeft >= TOOLTIP_W;
  const fitsRight = spaceRight >= TOOLTIP_W;

  if (pos === "top" && !fitsTop) pos = fitsBottom ? "bottom" : "bottom";
  if (pos === "bottom" && !fitsBottom) pos = fitsTop ? "top" : "top";
  if (pos === "left" && !fitsLeft) pos = fitsRight ? "right" : "bottom";
  if (pos === "right" && !fitsRight) pos = fitsLeft ? "left" : "bottom";

  let top: number;
  let left: number;

  switch (pos) {
    case "top":
      top = rect.top - gap - TOOLTIP_H_EST;
      left = rect.left + rect.width / 2 - TOOLTIP_W / 2;
      break;
    case "bottom":
      top = rect.top + rect.height + gap;
      left = rect.left + rect.width / 2 - TOOLTIP_W / 2;
      break;
    case "left":
      top = rect.top + rect.height / 2 - TOOLTIP_H_EST / 2;
      left = rect.left - gap - TOOLTIP_W;
      break;
    case "right":
      top = rect.top + rect.height / 2 - TOOLTIP_H_EST / 2;
      left = rect.left + rect.width + gap;
      break;
  }

  // Clamp to viewport bounds — always keep tooltip visible
  top = Math.max(EDGE, Math.min(top, vh - TOOLTIP_H_EST - EDGE));
  left = Math.max(EDGE, Math.min(left, vw - TOOLTIP_W - EDGE));

  return { top, left, width: TOOLTIP_W };
}

/* ─── Component ─── */
interface PageHintsProps {
  pageId: string;
}

export function PageHints({ pageId }: PageHintsProps) {
  const { t } = useI18n();
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<SpotlightRect | null>(null);
  const [scrolling, setScrolling] = useState(false);
  const rafRef = useRef<number>(0);
  const retryRef = useRef<number>(0);

  const tour = PAGE_TOURS[pageId];

  // Check if this page's tour should show
  useEffect(() => {
    if (!tour || tour.length === 0) return;
    const seen = getSeenPages();
    if (seen.has(pageId)) {
      setActive(false);
      return;
    }

    const timer = setTimeout(() => {
      setStep(0);
      setActive(true);
    }, 800);

    return () => clearTimeout(timer);
  }, [pageId, tour]);

  // Scroll & measure when step changes
  useEffect(() => {
    if (!active || !tour || !tour[step]) return;

    let cancelled = false;
    const currentStep = tour[step];

    const doScrollAndMeasure = async () => {
      setScrolling(true);
      await scrollToElement(currentStep.selector);
      if (cancelled) return;
      setScrolling(false);

      // Small extra delay to let layout settle after scroll
      await new Promise((r) => setTimeout(r, 80));
      if (cancelled) return;

      const newRect = getElementRect(currentStep.selector, currentStep.padding ?? 8);
      if (newRect) {
        setRect(newRect);
        retryRef.current = 0;
      } else {
        // Element not found yet — retry (for async pages like startup)
        if (retryRef.current < 8) {
          retryRef.current++;
          setTimeout(() => {
            if (!cancelled) doScrollAndMeasure();
          }, 600);
        } else {
          // Skip this step if element never appears
          retryRef.current = 0;
          if (step < tour.length - 1) {
            setStep(step + 1);
          } else {
            setActive(false);
            markPageSeen(pageId);
          }
        }
      }
    };

    doScrollAndMeasure();

    return () => {
      cancelled = true;
    };
  }, [active, tour, step, pageId]);

  // Track scroll/resize to update rect position
  const updateRect = useCallback(() => {
    if (!active || !tour || !tour[step] || scrolling) return;
    const currentStep = tour[step];
    const newRect = getElementRect(currentStep.selector, currentStep.padding ?? 8);
    if (newRect) setRect(newRect);
  }, [active, tour, step, scrolling]);

  useEffect(() => {
    if (!active) return;

    const onScroll = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updateRect);
    };
    window.addEventListener("resize", onScroll);

    // Also listen on .main scroll container
    const mainEl = document.querySelector(".main");
    if (mainEl) mainEl.addEventListener("scroll", onScroll);
    window.addEventListener("scroll", onScroll, true);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onScroll);
      if (mainEl) mainEl.removeEventListener("scroll", onScroll);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [active, updateRect]);

  const nextStep = useCallback(() => {
    if (!tour) return;
    if (step < tour.length - 1) {
      setStep(step + 1);
    } else {
      setActive(false);
      markPageSeen(pageId);
    }
  }, [step, tour, pageId]);

  const skip = useCallback(() => {
    setActive(false);
    markPageSeen(pageId);
  }, [pageId]);

  if (!active || !tour || !tour[step] || !rect || scrolling) return null;

  const currentStep = tour[step];
  const pos = currentStep.position || "bottom";
  const tooltipStyle = getTooltipStyle(rect, pos);

  // Clip-path: polygon that covers viewport with rectangular hole
  const clipPath = `polygon(
    0% 0%, 0% 100%,
    ${rect.left}px 100%, ${rect.left}px ${rect.top}px,
    ${rect.left + rect.width}px ${rect.top}px, ${rect.left + rect.width}px ${rect.top + rect.height}px,
    ${rect.left}px ${rect.top + rect.height}px, ${rect.left}px 100%,
    100% 100%, 100% 0%
  )`;

  return (
    <>
      {/* Dark overlay with cutout */}
      <div className="spotlight-overlay" style={{ clipPath }} onClick={skip} />

      {/* Spotlight border ring */}
      <div
        className="spotlight-ring"
        style={{
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        }}
      />

      {/* Tooltip */}
      <div className="spotlight-tooltip" style={tooltipStyle}>
        <div className="spotlight-tooltip__header">
          <div className="spotlight-tooltip__icon">
            <Icon name={currentStep.icon} size={18} weight="duotone" />
          </div>
          <div className="spotlight-tooltip__title">
            {t(currentStep.titleKey)}
          </div>
        </div>
        <div className="spotlight-tooltip__desc">
          {t(currentStep.descKey)}
        </div>
        <div className="spotlight-tooltip__footer">
          <span className="spotlight-tooltip__counter mono">
            {step + 1}/{tour.length}
          </span>
          <div className="spotlight-tooltip__actions">
            <button className="spotlight-tooltip__btn" onClick={skip}>
              {t("hints.skipAll")}
            </button>
            <button
              className="spotlight-tooltip__btn spotlight-tooltip__btn--primary"
              onClick={nextStep}
            >
              {step < tour.length - 1 ? t("hints.next") : t("hints.gotIt")}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
