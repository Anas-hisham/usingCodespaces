import { Plus, Upload } from 'lucide-react';
import { useMemo, useState } from 'react';
import { createPoolLead } from '@/domain/lead/createPoolLead';
import { ADMIN_PASTE_COLUMNS, parseAdminRows } from '@/domain/lead/leadImport';
import type { Lead, Workflow } from '@/domain/types';
import { campaignLabel } from '@/domain/workflow/campaignLabel';
import { LeadImportModalShell } from '@/features/lead-pool/components/LeadImportModalShell';
import { TEXT_INPUT_CLASS } from '@/features/lead-pool/formStyles';

export function PasteLeadsModal({ workflows, existing, onClose, onAdd, adminId, adminName }: {
  workflows: Workflow[]; existing: Lead[]; onClose: () => void; onAdd: (l: Lead[]) => void; adminId: string; adminName: string;
}) {
  const [campaign, setCampaign] = useState(workflows[0]?.campaignCode || '');
  const [text, setText] = useState('');
  const [added, setAdded] = useState(0);
  const parsed = useMemo(() => parseAdminRows(text, existing, campaign), [text, existing, campaign]);

  const handleAdd = () => {
    if (!parsed.accepted.length) return;
    onAdd(parsed.accepted.map(r => createPoolLead(adminId, adminName, {
      leadCode: r.leadCode, campaignCode: r.campaignCode, companyName: r.companyName,
      contactName: r.contactName, phone: r.phone, email: r.email,
    })));
    setAdded(n => n + parsed.accepted.length);
    if (parsed.rejected.length === 0) onClose(); else setText(parsed.rejected.map(r => r.raw).join('\n'));
  };

  return (
    <LeadImportModalShell title="Paste Leads" subtitle="They go to the shared pool - no agent yet" onClose={onClose}
      footer={<>
        <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100">Cancel</button>
        <button onClick={handleAdd} disabled={parsed.accepted.length === 0}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" />{parsed.accepted.length > 0 ? `Add ${parsed.accepted.length} lead${parsed.accepted.length === 1 ? '' : 's'}` : 'Add Leads'}
        </button>
      </>}>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Campaign</label>
        <select value={campaign} onChange={e => setCampaign(e.target.value)} className={TEXT_INPUT_CLASS}>
          {workflows.map(w => <option key={w.id} value={w.campaignCode}>{campaignLabel(workflows, w.campaignCode)}</option>)}
        </select>
        <p className="text-xs text-slate-500 mt-1">Every lead you paste goes into this campaign.</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5"><Upload className="w-3.5 h-3.5 inline mr-1" />Paste lead rows</label>
        <div className="text-xs text-slate-500 mb-2 bg-slate-50 rounded-lg p-2">
          {ADMIN_PASTE_COLUMNS.join(' [Tab] ')}
          <br />One lead per line. Everything is required except the phone, which is the last column and can be left out.
          The ID must be letters and numbers only and must not exist yet.
        </div>
        <textarea value={text} onChange={e => setText(e.target.value)} rows={8}
          placeholder={'LD101\tTechCorp\tJohn Smith\tjohn@techcorp.com\t+20 100 111 2222\nLD102\tDataSys\tJane Doe\tjane@datasys.com'}
          className={`${TEXT_INPUT_CLASS} font-mono resize-none`} />
        {added > 0 && <p className="mt-2 text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">{added} lead{added === 1 ? '' : 's'} added to the pool. The rows below need fixing.</p>}
        {text.trim() && (
          <div className="mt-2 text-xs space-y-1.5" aria-live="polite">
            <p><span className="font-medium text-emerald-700">{parsed.accepted.length} ready</span>
              {parsed.rejected.length > 0 && <span className="font-medium text-rose-600"> · {parsed.rejected.length} with a problem</span>}</p>
            {parsed.rejected.length > 0 && (
              <ul className="max-h-32 overflow-y-auto scrollbar-thin rounded-lg bg-rose-50 border border-rose-100 divide-y divide-rose-100">
                {parsed.rejected.slice(0, 50).map(r => (
                  <li key={r.line} className="px-3 py-1.5 text-rose-700"><span className="font-mono">Line {r.line}{r.leadCode ? ` · ${r.leadCode}` : ''}</span> — {r.reason}</li>
                ))}
                {parsed.rejected.length > 50 && <li className="px-3 py-1.5 text-rose-600">…and {parsed.rejected.length - 50} more</li>}
              </ul>
            )}
          </div>
        )}
      </div>
    </LeadImportModalShell>
  );
}
