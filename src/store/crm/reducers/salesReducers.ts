/** Sales recorded by the Quality role. */
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Sale } from '@/domain/types';
import type { AppState } from '@/store/state/AppState';

export const salesReducers = {
  recordSale(state: AppState, a: PayloadAction<Sale>) {
    if (state.users.find(u => u.id === state.currentUserId)?.role !== 'quality') return;
    // A sale must belong to a real lead: the lead (not the company name) is what identifies it
    const lead = state.leads.find(l => l.id === a.payload.leadId);
    if (!lead) return;
    state.sales.unshift({ ...a.payload, leadName: lead.companyName });
  },
  deleteSale(state: AppState, a: PayloadAction<string>) {
    if (state.users.find(u => u.id === state.currentUserId)?.role !== 'quality') return;
    state.sales = state.sales.filter(x => x.id !== a.payload);
  },
};
