import { ChevronDown, ChevronRight, Send, Square } from 'lucide-react';
import { useState } from 'react';
import type { BatchTemplateType } from '@/domain/email/emailBatches';
import type { EmailTemplate, Lead } from '@/domain/types';
import { isValidEmail } from '@/domain/lead/leadCode';
import { describeDueDate, findCurrentTouchPoint, stepLabel } from '@/domain/workflow/touchPoints';
import { DUE_TONE_CLASS } from '@/features/work-queue/queueStyles';
import type { SendProgress } from '@/features/email-center/useSequentialSend';

/**
 * One group of email touch points (Discovery leads OR No Response leads) with its own template.
 * Pick some / all, press send: the emails go out one by one and each lead's email step is marked complete.
 */
export function EmailTouchPointGroup({
  type, title, template, leads, progress, busy, onSend, onStop,
}: {
  type: BatchTemplateType;
  title: string;
  template: EmailTemplate | undefined;
  leads: Lead[];
  progress: SendProgress;
  busy: boolean;                       // some group is sending right now
  onSend: (leadIds: string[]) => void;
  onStop: () => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [showTemplate, setShowTemplate] = useState(false);
  const sendable = leads.filter(l => isValidEmail(l.email || ''));
  const picked = selected.filter(id => sendable.some(l => l.id === id));          // leads that left the list are dropped
  const allSelected = sendable.length > 0 && picked.length === sendable.length;
  const toggle = (id: string) => setSelected(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  const dot = type === 'discovery' ? 'bg-emerald-500' : 'bg-slate-400';

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-3 flex-wrap">
        <span className={`w-2.5 h-2.5 rounded-full ${dot}`} />
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <span className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">{leads.length}</span>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSelected(allSelected ? [] : sendable.map(l => l.id))}
            disabled={sendable.length === 0 || busy}
            className="text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-40"
          >
            {allSelected ? 'Clear all' : 'Select all'}
          </button>
          {busy && progress.running ? (
            <button onClick={onStop} className="px-3 py-1.5 rounded-lg text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 flex items-center gap-1.5">
              <Square className="w-3 h-3" />Stop ({progress.done}/{progress.total})
            </button>
          ) : (
            <button
              onClick={() => { onSend(picked); setSelected([]); }}
              disabled={picked.length === 0 || busy || !template}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-40 transition-all flex items-center gap-1.5"
            >
              <Send className="w-3 h-3" />Send {picked.length > 0 ? picked.length : ''} & mark complete
            </button>
          )}
        </div>
      </div>

      {template && (
        <div className="px-5 py-2 border-b border-slate-100 bg-slate-50/60 text-xs text-slate-600">
          <button onClick={() => setShowTemplate(o => !o)} className="flex items-center gap-1.5 hover:text-slate-900">
            {showTemplate ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            Template: <b className="text-slate-800">{template.name}</b> — {template.subject}
          </button>
          {showTemplate && <pre className="mt-2 whitespace-pre-wrap font-sans text-slate-700 bg-white border border-slate-200 rounded-lg p-3">{template.body}</pre>}
        </div>
      )}

      {leads.length === 0 ? (
        <p className="px-5 py-6 text-sm text-slate-500 text-center">No {title} email touch points right now.</p>
      ) : (
        <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto scrollbar-thin">
          {leads.map(l => {
            const tp = findCurrentTouchPoint(l);
            const due = describeDueDate(tp);
            const hasEmail = isValidEmail(l.email || '');
            return (
              <label key={l.id} className={`flex items-center gap-3 px-5 py-2.5 ${hasEmail ? 'hover:bg-slate-50 cursor-pointer' : 'opacity-60'}`}>
                <input type="checkbox" disabled={!hasEmail || busy} checked={picked.includes(l.id)} onChange={() => toggle(l.id)} className="rounded" />
                <span className="text-xs font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">{l.leadCode}</span>
                <span className="text-sm text-slate-800 truncate flex-1">{l.companyName}<span className="text-slate-500"> · {l.contactName}</span></span>
                <span className="text-xs text-slate-500 truncate hidden sm:block max-w-[200px]">{hasEmail ? l.email : <span className="text-rose-500">no valid email</span>}</span>
                {tp && <span className="text-xs text-slate-500 shrink-0">{stepLabel(tp.order, tp.type)}</span>}
                <span className={`text-xs shrink-0 ${DUE_TONE_CLASS[due.tone]}`}>{due.label}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
