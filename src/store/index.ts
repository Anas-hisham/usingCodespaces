import { configureStore } from '@reduxjs/toolkit';
import crmReducer, { persistState, parseStoredState, hydrate, STORAGE_KEY } from './crmSlice';

export const store = configureStore({
  reducer: { crm: crmReducer },
});

// ---------------------------------------------------------------------------
// Persistence (localStorage)
//  - debounced, so rapid dispatches don't thrash it
//  - flushed when the tab is hidden / closed, so the last 150 ms of work is never lost
//  - tells the UI when the browser refuses to save (storage full), instead of failing silently
//  - another tab's changes are picked up, so two open tabs don't overwrite each other
// ---------------------------------------------------------------------------
export const PERSIST_FAILED_EVENT = 'crm:persist-failed';
export const PERSIST_OK_EVENT = 'crm:persist-ok';

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
    try { store.dispatch(hydrate(next)); } finally { applyingRemote = false; }
  });
}

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type { AppState } from './seed';
export * from './crmSlice';
export * from './hooks';
