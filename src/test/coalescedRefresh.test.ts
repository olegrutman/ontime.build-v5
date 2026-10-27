import { afterEach, describe, expect, it, vi } from 'vitest';
import { coalescedRefresh } from '@/lib/coalescedRefresh';

describe('realtime refresh bursts', () => {
  afterEach(() => vi.useRealTimers());
  it('refreshes only once for a multi-row transaction', () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    const refresh = coalescedRefresh(callback);
    for (let i = 0; i < 24; i++) refresh.schedule();
    vi.advanceTimersByTime(299);
    expect(callback).toHaveBeenCalledTimes(0);
    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(1);
    refresh.schedule();
    vi.advanceTimersByTime(300);
    expect(callback).toHaveBeenCalledTimes(2);
  });
  it('cancels pending refreshes on leaving a screen', () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    const refresh = coalescedRefresh(callback);
    refresh.schedule();
    refresh.cancel();
    vi.advanceTimersByTime(1000);
    expect(callback).not.toHaveBeenCalled();
  });
});