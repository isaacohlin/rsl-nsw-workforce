import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'rsl-nsw-workforce-v1';

function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export function useCloudState(initialState) {
  const [state, setState] = useState(initialState);
  const [syncStatus, setSyncStatus] = useState('idle');
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setState(JSON.parse(saved));
      }
    } catch (e) {
      console.log('No saved state, using defaults');
    } finally {
      setLoaded(true);
    }
  }, []);

  // Save to localStorage with debounce
  const save = useCallback(
    debounce((val) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(val));
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
      setSyncStatus('saving');
      save(next);
      return next;
    });
  }, [save]);

  return { state, update, syncStatus, loaded };
}
