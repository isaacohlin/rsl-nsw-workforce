import { useState, useEffect, useCallback } from 'react';

const SUPABASE_URL = 'https://rihkkkeiwkbqfypvzkrr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ilW87DHzlwxlsOybrEKOIA_W9JrDpH4';
const ROW_ID = 'main';

function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

async function dbLoad() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/workforce_state?id=eq.${ROW_ID}&select=state`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
  );
  if (!res.ok) throw new Error('Load failed');
  const rows = await res.json();
  return rows[0]?.state || null;
}

async function dbSave(state, userName) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/workforce_state?id=eq.${ROW_ID}`,
    {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        state,
        updated_by: userName || 'Unknown',
        updated_at: new Date().toISOString(),
      }),
    }
  );
  if (!res.ok) throw new Error('Save failed');
}

export function useCloudState(initialState, userName) {
  const [state, setState] = useState(initialState);
  const [syncStatus, setSyncStatus] = useState('idle');
  const [loaded, setLoaded] = useState(false);
  const [lastSavedBy, setLastSavedBy] = useState(null);

  // Load from Supabase on mount
  useEffect(() => {
    async function load() {
      try {
        const saved = await dbLoad();
        if (saved && Object.keys(saved).length > 0) {
          setState(saved);
        }
      } catch (e) {
        console.warn('Could not load from Supabase, using defaults:', e);
      } finally {
        setLoaded(true);
      }
    }
    load();
  }, []);

  // Debounced save to Supabase
  const save = useCallback(
    debounce(async (val, name) => {
      setSyncStatus('saving');
      try {
        await dbSave(val, name);
        setSyncStatus('saved');
        setTimeout(() => setSyncStatus('idle'), 2500);
      } catch (e) {
        console.error('Save error:', e);
        setSyncStatus('error');
      }
    }, 1000),
    []
  );

  const update = useCallback((updater) => {
    setState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      setSyncStatus('saving');
      save(next, userName);
      return next;
    });
  }, [save, userName]);

  // Reload from DB (called on manual refresh)
  const reload = useCallback(async () => {
    setSyncStatus('loading');
    try {
      const saved = await dbLoad();
      if (saved && Object.keys(saved).length > 0) {
        setState(saved);
      }
      setSyncStatus('idle');
    } catch (e) {
      setSyncStatus('error');
    }
  }, []);

  return { state, update, syncStatus, loaded, reload };
}
