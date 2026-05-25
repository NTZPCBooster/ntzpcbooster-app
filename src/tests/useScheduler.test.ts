import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useScheduler, DEFAULT_SCHEDULER } from '../hooks/useScheduler';

describe('useScheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not run when disabled', () => {
    const onRun = vi.fn(() => Promise.resolve());
    const onComplete = vi.fn();

    // Set to correct day/time but disabled
    const now = new Date(2026, 4, 23, 3, 5); // Saturday, 03:05
    vi.setSystemTime(now);

    renderHook(() =>
      useScheduler({
        config: { enabled: false, dayOfWeek: 6, time: '03:00' },
        lastScheduledRun: null,
        onRun,
        onComplete,
      }),
    );

    expect(onRun).not.toHaveBeenCalled();
  });

  it('runs when it is the correct day and after the scheduled time', async () => {
    const onRun = vi.fn(() => Promise.resolve());
    const onComplete = vi.fn();

    // Saturday 03:05, scheduled for Saturday 03:00
    const now = new Date(2026, 4, 23, 3, 5);
    vi.setSystemTime(now);

    renderHook(() =>
      useScheduler({
        config: { enabled: true, dayOfWeek: 6, time: '03:00' },
        lastScheduledRun: null,
        onRun,
        onComplete,
      }),
    );

    // Flush microtasks to allow the async checkAndRun to resolve
    await act(async () => {
      await Promise.resolve();
    });

    expect(onRun).toHaveBeenCalledTimes(1);
    expect(onRun).toHaveBeenCalledWith(expect.any(Array));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('does not run on the wrong day', () => {
    const onRun = vi.fn(() => Promise.resolve());
    const onComplete = vi.fn();

    // Sunday (0) but scheduled for Saturday (6)
    const now = new Date(2026, 4, 24, 3, 5); // Sunday
    vi.setSystemTime(now);

    renderHook(() =>
      useScheduler({
        config: { enabled: true, dayOfWeek: 6, time: '03:00' },
        lastScheduledRun: null,
        onRun,
        onComplete,
      }),
    );

    expect(onRun).not.toHaveBeenCalled();
  });

  it('does not run before the scheduled time', () => {
    const onRun = vi.fn(() => Promise.resolve());
    const onComplete = vi.fn();

    // Saturday 02:50, scheduled for 03:00
    const now = new Date(2026, 4, 23, 2, 50);
    vi.setSystemTime(now);

    renderHook(() =>
      useScheduler({
        config: { enabled: true, dayOfWeek: 6, time: '03:00' },
        lastScheduledRun: null,
        onRun,
        onComplete,
      }),
    );

    expect(onRun).not.toHaveBeenCalled();
  });

  it('does not run again if lastScheduledRun is after today scheduled time', async () => {
    const onRun = vi.fn(() => Promise.resolve());
    const onComplete = vi.fn();

    // Saturday 03:05, already ran today at 03:01
    const now = new Date(2026, 4, 23, 3, 5);
    vi.setSystemTime(now);

    const lastRun = new Date(2026, 4, 23, 3, 1).toISOString();

    renderHook(() =>
      useScheduler({
        config: { enabled: true, dayOfWeek: 6, time: '03:00' },
        lastScheduledRun: lastRun,
        onRun,
        onComplete,
      }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(onRun).not.toHaveBeenCalled();
  });

  it('DEFAULT_SCHEDULER has correct defaults', () => {
    expect(DEFAULT_SCHEDULER.enabled).toBe(false);
    expect(DEFAULT_SCHEDULER.dayOfWeek).toBe(6);
    expect(DEFAULT_SCHEDULER.time).toBe('03:00');
  });
});
