/** Writes the state to localStorage. */
import { STORAGE_KEY } from '@/store/persistence/storageKey';
import type { AppState } from '@/store/state/AppState';

/** Saves the state. Returns false when the browser refused (storage full / blocked) so the UI can warn the user. */
export const persistState = (state: AppState): boolean => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); return true; }
  catch (err) { console.error('Could not save the data to localStorage', err); return false; }
};
