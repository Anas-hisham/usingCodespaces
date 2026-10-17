import { configureStore } from '@reduxjs/toolkit';
import crmReducer, { persistState } from './crmSlice';

export const store = configureStore({
  reducer: { crm: crmReducer },
});

// Persist to localStorage (debounced so rapid dispatches don't thrash it)
let timer: ReturnType<typeof setTimeout> | undefined;
store.subscribe(() => {
  clearTimeout(timer);
  timer = setTimeout(() => persistState(store.getState().crm), 150);
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type { AppState } from './seed';
export * from './crmSlice';
export * from './hooks';
