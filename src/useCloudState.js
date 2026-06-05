import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'rsl-nsw-workforce-v1';

// Debounce helper
function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export function useCloudState(initialState) {
  const [state, setState] = useState(initialState);
  const [syncStatus, setSyncStatus] = useState('idle'); // idle | saving | saved | error
  const [loaded, setLoaded] = useState(false);

  // Load on mount
  useEffect(() => {
    async function load() {
      try {
        const result = await window.storage.get(STORAGE_KEY);
        if (result && result.value) {
          const parsed = JSON.parse(result.value);
          setState(parsed);
        }
      } catch (e) {
        // No saved state yet — use initial
        console.log('No saved state, using defaults');
      } finally {
        setLoaded(true);
      }
    }
    load();
  }, []);

  // Save with debounce
  const save = useCallback(
    debounce(async (val) => {
      setSyncStatus('saving');
      try {
        await window.storage.set(STORAGE_KEY, JSON.stringify(val));
        setSyncStatus('saved');
        setTimeout(() => setSyncStatus('idle'), 2000);
      } catch (e) {
        setSyncStatus('error');
        console.error('Save failed:', e);
      }
    }, 800),
    []
  );

  const update = useCallback((updater) => {
    setState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      save(next);
      return next;
    });
  }, [save]);

  return { state, update, syncStatus, loaded };
}
