import { Plus } from 'lucide-react';
import { useState } from 'react';
import { createPoolLead } from '@/domain/lead/createPoolLead';
import { cleanLeadCode, isValidEmail, isValidLeadCode, normalizeLeadCode } from '@/domain/lead/leadCode';
import type { Lead, Workflow } from '@/domain/types';
import { campaignLabel } from '@/domain/workflow/campaignLabel';
import { LeadImportModalShell } from '@/features/lead-pool/components/LeadImportModalShell';
import { TEXT_INPUT_CLASS } from '@/features/lead-pool/formStyles';

export function AddSingleLeadModal({ workflows, existing, onClose, onAdd, adminId, adminName }: {
  workflows: Workflow[]; existing: Lead[]; onClose: () => void; onAdd: (l: Lead) => void; adminId: string; adminName: string;
}) {
  const [f, setF] = useState({ leadCode: '', companyName: '', contactName: '', phone: '', email: '', campaignCode: workflows[0]?.campaignCode || '' });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF(p => ({ ...p, [k]: e.target.value }));

  const code = cleanLeadCode(f.leadCode);
  const error =
    !code ? '' :
    !isValidLeadCode(code) ? 'Lead ID must contain letters and numbers only' :
    existing.some(l => normalizeLeadCode(l.leadCode) === normalizeLeadCode(code)) ? 'This lead ID already exists' :
    f.email && !isValidEmail(f.email.trim()) ? 'Invalid email' : '';
  const canAdd = !!code && !error && !!f.companyName.trim() && !!f.campaignCode;

  const submit = () => {
    if (!canAdd) return;
    onAdd(createPoolLead(adminId, adminName, {
      leadCode: code, campaignCode: f.campaignCode, companyName: f.companyName.trim(),
      contactName: f.contactName.trim(), phone: f.phone.trim(), email: f.email.trim(),
    }));
    onClose();
  };

  return (
    <LeadImportModalShell title="Add One Lead" subtitle="It goes to the shared pool" onClose={onClose}
      footer={<>
        <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100">Cancel</button>
        <button onClick={submit} disabled={!canAdd} className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" />Add Lead
        </button>
      </>}>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Lead ID *</label><input className={TEXT_INPUT_CLASS} value={f.leadCode} onChange={set('leadCode')} autoFocus /></div>
        <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Campaign *</label>
          <select className={TEXT_INPUT_CLASS} value={f.campaignCode} onChange={set('campaignCode')}>
            {workflows.map(w => <option key={w.id} value={w.campaignCode}>{campaignLabel(workflows, w.campaignCode)}</option>)}
          </select></div>
        <div className="col-span-2"><label className="block text-sm font-medium text-slate-700 mb-1.5">Company *</label><input className={TEXT_INPUT_CLASS} value={f.companyName} onChange={set('companyName')} /></div>
        <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Contact person</label><input className={TEXT_INPUT_CLASS} value={f.contactName} onChange={set('contactName')} /></div>
        <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label><input className={TEXT_INPUT_CLASS} value={f.phone} onChange={set('phone')} /></div>
        <div className="col-span-2"><label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label><input className={TEXT_INPUT_CLASS} value={f.email} onChange={set('email')} /></div>
      </div>
      {error && <p className="text-xs text-rose-700 bg-rose-50 rounded-lg px-3 py-2">{error}</p>}
    </LeadImportModalShell>
  );
}
