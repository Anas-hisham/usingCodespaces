import type { Store } from '@reduxjs/toolkit';
import type { AppState } from '@/store/state/AppState';
import { applyStateFromOtherTab } from '@/store/crm/crmSlice';
import { STORAGE_KEY } from '@/store/persistence/storageKey';
import { parseStoredState } from '@/store/persistence/storedStateParser';
import { persistState } from '@/store/persistence/persistState';
import { PERSIST_FAILED_EVENT, PERSIST_OK_EVENT } from '@/store/persistence/persistenceEvents';

/**
 * Keeps localStorage in sync with the store (this is the "database" of the app).
 *  - debounced, so rapid dispatches don't thrash it
 *  - flushed when the tab is hidden / closed, so the last 150 ms of work is never lost
 *  - tells the UI when the browser refuses to save (storage full), instead of failing silently
 *  - another tab's changes are picked up, so two open tabs don't overwrite each other
 */
export function startStatePersistence(store: Store<{ crm: AppState }>) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let dirty = false;
  let applyingRemote = false;

  function flush() {
    clearTimeout(timer);
    if (!dirty) return;          // nothing new here: never overwrite another tab's newer data with an old copy
    dirty = false;
    const ok = persistState(store.getState().crm);
    window.dispatchEvent(new Event(ok ? PERSIST_OK_EVENT : PERSIST_FAILED_EVENT));
  }

  store.subscribe(() => {
    if (applyingRemote) return;  // this change CAME from storage; writing it back would ping-pong between tabs
    dirty = true;
    clearTimeout(timer);
    timer = setTimeout(flush, 150);
  });

  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });

    window.addEventListener('storage', e => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      const next = parseStoredState(e.newValue);
      if (!next) return;
      clearTimeout(timer);
      dirty = false;
      applyingRemote = true;
      try { store.dispatch(applyStateFromOtherTab(next)); } finally { applyingRemote = false; }
    });
  }
}
