/** What the app starts with: the saved state if there is one, otherwise the demo data. */
import { STORAGE_KEY } from '@/store/persistence/storageKey';
import { parseStoredState } from '@/store/persistence/storedStateParser';
import { createInitialState } from '@/store/seed/createInitialState';
import type { AppState } from '@/store/state/AppState';

export function loadInitialState(): AppState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const state = parseStoredState(stored);
      if (state) return state;
      // the saved text is damaged: keep a copy for recovery instead of silently overwriting it
      try { localStorage.setItem(`${STORAGE_KEY}-corrupt-${Date.now()}`, stored); } catch { /* storage is full */ }
    }
  } catch { /* storage is blocked (private mode) - run in memory */ }
  return createInitialState();
}
