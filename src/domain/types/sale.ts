/** Sales recorded by the Quality role. */
// ---------------------------------------------------------------------------
// Sales (recorded by the Quality role)
// ---------------------------------------------------------------------------
export type SaleType = 'BP' | 'PPI' | 'MUA' | 'ATEP' | 'Activation' | 'Retention' | 'Transition';

export interface Sale {
  id: string;
  agentId: string;
  leadId: string;         // REQUIRED: the lead is the identity of a sale (company names can repeat). Campaign is derived from it.
  leadName: string;       // snapshot of the company name at the time of the sale (display only)
  saleType: SaleType;
  date: string;           // YYYY-MM-DD, the day the sale happened
  createdBy: string;      // the quality user who recorded it
  createdAt: string;
}
