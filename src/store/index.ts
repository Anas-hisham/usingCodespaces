import { configureStore } from '@reduxjs/toolkit';
import crmReducer from '@/store/crm/crmSlice';
import { startStatePersistence } from '@/store/persistence/startStatePersistence';

export const store = configureStore({
  reducer: { crm: crmReducer },
});

// localStorage is the "database": see store/persistence/startStatePersistence.ts
startStatePersistence(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type { AppState } from '@/store/state/AppState';
export * from '@/store/crm/crmSlice';
export * from '@/store/hooks';
export { PERSIST_FAILED_EVENT, PERSIST_OK_EVENT } from '@/store/persistence/persistenceEvents';
