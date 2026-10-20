import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCardCollapse } from '@/hooks/useCardCollapse';

describe('budget card collapse preference', () => {
  beforeEach(() => localStorage.clear());

  it('starts open, then remembers the collapsed choice per project', () => {
    const card = renderHook(() => useCardCollapse('crew-budget-project-1'));
    expect(card.result.current.collapsed).toBe(false);

    act(() => card.result.current.toggle());
    expect(card.result.current.collapsed).toBe(true);
    expect(localStorage.getItem('ontime_card_crew-budget-project-1')).toBe('collapsed');

    // Reopening the same project restores the collapsed card.
    const reopened = renderHook(() => useCardCollapse('crew-budget-project-1'));
    expect(reopened.result.current.collapsed).toBe(true);

    // Another project keeps its own state.
    const other = renderHook(() => useCardCollapse('crew-budget-project-2'));
    expect(other.result.current.collapsed).toBe(false);

    act(() => reopened.result.current.toggle());
    expect(reopened.result.current.collapsed).toBe(false);
    expect(localStorage.getItem('ontime_card_crew-budget-project-1')).toBe('open');
    expect(other.result.current.collapsed).toBe(false);
  });
});
