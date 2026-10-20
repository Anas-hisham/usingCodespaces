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
    // Quality records sales only for the agents it follows
    if (!state.users.some(u => u.id === a.payload.agentId && u.role === 'agent' && u.qualityId === state.currentUserId)) return;
    state.sales.unshift({ ...a.payload, leadName: lead.companyName });
  },
  deleteSale(state: AppState, a: PayloadAction<string>) {
    if (state.users.find(u => u.id === state.currentUserId)?.role !== 'quality') return;
    const sale = state.sales.find(x => x.id === a.payload);
    if (!sale || state.users.find(u => u.id === sale.agentId)?.qualityId !== state.currentUserId) return;
    state.sales = state.sales.filter(x => x.id !== a.payload);
  },
};
