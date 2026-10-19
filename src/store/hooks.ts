import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from '@/store';

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

/** Convenience: the whole CRM state + dispatch (components can migrate to granular selectors over time). */
export function useStore() {
  const state = useAppSelector(s => s.crm);
  const dispatch = useAppDispatch();
  return { state, dispatch };
}
