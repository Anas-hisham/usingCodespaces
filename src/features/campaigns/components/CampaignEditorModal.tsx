import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Workflow } from '@/domain/types';
import {
  MAX_TOUCH_POINTS, cleanCampaignCode, describeGap, draftStepsFromTemplates, validateWorkflowDraft,
  type DraftStep, type WorkflowDraft,
} from '@/domain/workflow/workflowDraft';
import { LeadImportModalShell } from '@/features/lead-pool/components/LeadImportModalShell';
import { TEXT_INPUT_CLASS } from '@/features/lead-pool/formStyles';

/** Create a campaign, or edit one: its code, name and every touch point (type, name, days after the previous step). */
export function CampaignEditorModal({ workflow, otherCodes, leadCount, onSave, onClose }: {
  workflow: Workflow | null;          // null = a new campaign
  otherCodes: string[];
  leadCount: number;                  // leads that already use this campaign
  onSave: (d: WorkflowDraft) => void;
  onClose: () => void;
}) {
  const [code, setCode] = useState(workflow?.campaignCode ?? '');
  const [name, setName] = useState(workflow?.name ?? '');
  const [steps, setSteps] = useState<DraftStep[]>(
    workflow ? draftStepsFromTemplates(workflow.touchPoints) : [{ type: 'email', label: 'Intro Email', gapDays: 0 }],
  );
  const draft: WorkflowDraft = { campaignCode: code, name, steps };
  const problem = useMemo(() => validateWorkflowDraft(draft, otherCodes), [code, name, steps, otherCodes]); // eslint-disable-line react-hooks/exhaustive-deps

  const patch = (i: number, p: Partial<DraftStep>) => setSteps(s => s.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const move = (i: number, d: -1 | 1) => setSteps(s => {
    const j = i + d; if (j < 0 || j >= s.length) return s;
    const n = [...s]; [n[i], n[j]] = [n[j], n[i]]; return n;
  });
  const totalDays = steps.reduce((sum, s, i) => sum + (i === 0 ? 0 : (Number.isFinite(s.gapDays) ? s.gapDays : 0)), 0);
  const label = 'block text-sm font-medium text-slate-700 mb-1.5';

  return (
    <LeadImportModalShell title={workflow ? 'Edit Campaign' : 'New Campaign'} subtitle="Touch points, their type and the time between them" onClose={onClose}
      footer={<>
        <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100">Cancel</button>
        <button onClick={() => onSave({ ...draft, campaignCode: cleanCampaignCode(code) })} disabled={!!problem}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40">Save campaign</button>
      </>}>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>Campaign code *</label>
          <input className={`${TEXT_INPUT_CLASS} font-mono ${workflow ? 'bg-slate-50' : ''}`} value={code} onChange={e => setCode(e.target.value)}
            disabled={!!workflow} placeholder="e.g. WIN-003" autoFocus={!workflow} />
        </div>
        <div>
          <label className={label}>Name *</label>
          <input className={TEXT_INPUT_CLASS} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Win-back Campaign" />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-medium text-slate-700">Touch points ({steps.length})</span>
          <span className="text-xs text-slate-500">Whole workflow ≈ {totalDays} day{totalDays === 1 ? '' : 's'}</span>
        </div>
        <ol className="space-y-2">
          {steps.map((s, i) => (
            <li key={i} className="rounded-xl border border-slate-200 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center shrink-0">{i + 1}</span>
                <select value={s.type} onChange={e => patch(i, { type: e.target.value as DraftStep['type'] })} aria-label={`Touch point ${i + 1} type`}
                  className="px-2 py-1.5 rounded-lg border border-slate-300 text-sm bg-white">
                  <option value="call">Call</option>
                  <option value="email">Email</option>
                </select>
                <input value={s.label} onChange={e => patch(i, { label: e.target.value })} aria-label={`Touch point ${i + 1} name`} placeholder="Name"
                  className="flex-1 min-w-0 px-2 py-1.5 rounded-lg border border-slate-300 text-sm" />
                <button onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up" className="p-1 text-slate-500 hover:text-slate-800 disabled:opacity-30"><ArrowUp className="w-4 h-4" /></button>
                <button onClick={() => move(i, 1)} disabled={i === steps.length - 1} aria-label="Move down" className="p-1 text-slate-500 hover:text-slate-800 disabled:opacity-30"><ArrowDown className="w-4 h-4" /></button>
                <button onClick={() => setSteps(x => x.filter((_, j) => j !== i))} disabled={steps.length === 1} aria-label="Remove touch point" className="p-1 text-slate-500 hover:text-rose-600 disabled:opacity-30"><Trash2 className="w-4 h-4" /></button>
              </div>
              <div className="flex items-center gap-2 pl-8 text-xs text-slate-600">
                {i === 0 ? <span>{describeGap(0, 0)}</span> : (
                  <>
                    <span>Wait</span>
                    <input type="number" min={0} max={90} value={Number.isFinite(s.gapDays) ? s.gapDays : ''} aria-label={`Days before touch point ${i + 1}`}
                      onChange={e => patch(i, { gapDays: e.target.value === '' ? NaN : Number(e.target.value) })}
                      className="w-16 px-2 py-1 rounded-lg border border-slate-300 text-sm" />
                    <span>days after the previous step {s.gapDays === 0 && '(right away)'}</span>
                  </>
                )}
              </div>
            </li>
          ))}
        </ol>
        <button onClick={() => setSteps(x => [...x, { type: x[x.length - 1]?.type === 'call' ? 'email' : 'call', label: '', gapDays: 1 }])} disabled={steps.length >= MAX_TOUCH_POINTS}
          className="mt-2 px-3 py-1.5 rounded-lg border border-dashed border-slate-300 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 disabled:opacity-40">
          <Plus className="w-3.5 h-3.5" />Add touch point
        </button>
      </div>

      {workflow && leadCount > 0 && (
        <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
          {leadCount} lead{leadCount === 1 ? '' : 's'} already use this campaign. They keep the touch points they have now;
          the changes apply to leads taken or transferred after you save.
        </p>
      )}
      {problem && (code || name) && <p className="text-xs text-rose-700 bg-rose-50 rounded-lg px-3 py-2">{problem}</p>}
    </LeadImportModalShell>
  );
}
