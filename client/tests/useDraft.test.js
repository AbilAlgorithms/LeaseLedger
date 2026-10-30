import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDraft } from '../src/hooks/useDraft.js';

describe('useDraft Hook Unit Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saves and retrieves item draft to localStorage', () => {
    const { result } = renderHook(() => useDraft('insp_123'));

    expect(result.current.hasUnsyncedDrafts).toBe(false);

    act(() => {
      result.current.saveDraft('item_1', { rating: 4, notes: 'Minor wear' });
    });

    expect(result.current.hasUnsyncedDrafts).toBe(true);

    const draft = result.current.getDraft('item_1');
    expect(draft).toBeDefined();
    expect(draft.rating).toBe(4);
    expect(draft.notes).toBe('Minor wear');
  });

  it('clears item draft and resets unsynced status when empty', () => {
    const { result } = renderHook(() => useDraft('insp_456'));

    act(() => {
      result.current.saveDraft('item_2', { rating: 5 });
    });
    expect(result.current.hasUnsyncedDrafts).toBe(true);

    act(() => {
      result.current.clearDraft('item_2');
    });

    expect(result.current.hasUnsyncedDrafts).toBe(false);
    expect(result.current.getDraft('item_2')).toBeNull();
  });
});
