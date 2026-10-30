import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

export function useDraft(inspectionId) {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [hasUnsyncedDrafts, setHasUnsyncedDrafts] = useState(false);

  const storageKey = `leaseledger_draft_${inspectionId}`;

  // Check unsynced drafts on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Object.keys(parsed).length > 0) {
          setHasUnsyncedDrafts(true);
        }
      }
    } catch (e) {
      // Ignore localStorage errors
    }
  }, [storageKey]);

  // Online / offline event listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      toast.success('Connection restored. Synchronizing inspection data...');
    };

    const handleOffline = () => {
      setIsOffline(true);
      toast('You are currently offline. Changes are saved locally on this device.', {
        icon: '📡',
        duration: 5000,
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const saveDraft = useCallback(
    (itemId, data) => {
      try {
        const existing = JSON.parse(localStorage.getItem(storageKey) || '{}');
        existing[itemId] = {
          ...existing[itemId],
          ...data,
          updatedAt: new Date().toISOString(),
        };
        localStorage.setItem(storageKey, JSON.stringify(existing));
        setHasUnsyncedDrafts(true);
      } catch (err) {
        console.error('Failed to save local draft:', err);
      }
    },
    [storageKey]
  );

  const getDraft = useCallback(
    (itemId) => {
      try {
        const existing = JSON.parse(localStorage.getItem(storageKey) || '{}');
        return existing[itemId] || null;
      } catch (err) {
        return null;
      }
    },
    [storageKey]
  );

  const clearDraft = useCallback(
    (itemId) => {
      try {
        const existing = JSON.parse(localStorage.getItem(storageKey) || '{}');
        delete existing[itemId];
        if (Object.keys(existing).length === 0) {
          localStorage.removeItem(storageKey);
          setHasUnsyncedDrafts(false);
        } else {
          localStorage.setItem(storageKey, JSON.stringify(existing));
        }
      } catch (err) {
        console.error('Failed to clear draft:', err);
      }
    },
    [storageKey]
  );

  return {
    isOffline,
    hasUnsyncedDrafts,
    saveDraft,
    getDraft,
    clearDraft,
  };
}
