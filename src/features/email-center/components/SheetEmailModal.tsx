import { CheckCircle2, Loader2, Send, Square, Table2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { fillSheetTemplate, parseEmailSheet, TEMPLATE_TYPE_LABEL, type BatchTemplateType, type SheetEmailRow } from '@/domain/email/emailBatches';
import { fillEmailTemplate } from '@/domain/email/fillEmailTemplate';
import type { EmailTemplate, Lead } from '@/domain/types';
import { useSequentialSend } from '@/features/email-center/useSequentialSend';
import { TEXT_INPUT_CLASS } from '@/features/lead-pool/formStyles';

/**
 * Bulk email from a sheet: paste rows (Email | Name | Company) copied from Excel, pick ONE template,
 * and the emails are sent one after another automatically. If an email belongs to one of the agent's leads,
 * the email is linked to that lead (its history), but its touch points are not changed.
 */
export function SheetEmailModal({ templates, myLeads, agentName, onClose, onSendOne }: {
  templates: EmailTemplate[];
  agentName: string;
  myLeads: Lead[];
  onClose: () => void;
  onSendOne: (p: { to: string; subject: string; body: string; templateType: BatchTemplateType; leadId?: string; leadName: string }) => void;
}) {
  const [type, setType] = useState<BatchTemplateType>('no_response');
  const [text, setText] = useState('');
  const template = templates.find(t => t.type === type);
  const parsed = useMemo(() => parseEmailSheet(text), [text]);
  const { progress, run, stop } = useSequentialSend();
  const started = progress.total > 0;
  const finished = started && !progress.running;

  const leadByEmail = useMemo(() => new Map(myLeads.filter(l => l.email).map(l => [l.email.toLowerCase(), l])), [myLeads]);

  const handleSend = () => {
    if (!template || parsed.accepted.length === 0) return;
    const rows = parsed.accepted;
    run<SheetEmailRow>(rows, row => {
      const lead = leadByEmail.get(row.email.toLowerCase());
      const fill = (s: string) => (lead ? fillEmailTemplate(s, lead, agentName) : fillSheetTemplate(s, row, agentName));
      onSendOne({
        to: row.email, subject: fill(template.subject), body: fill(template.body),
        templateType: type, leadId: lead?.id, leadName: lead?.companyName ?? row.company,
      });
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={progress.running ? undefined : onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 animate-slide-up max-h-modal overflow-y-auto scrollbar-thin">
        <div className="px-4 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Send from sheet</h2>
            <p className="text-sm text-slate-600">Paste emails, pick a template — they are sent one by one</p>
          </div>
          <button onClick={onClose} disabled={progress.running} aria-label="Close" className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center disabled:opacity-40">
            <X className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        <div className="px-4 sm:px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Template</label>
            <div className="flex gap-2">
              {(['discovery', 'no_response'] as const).map(t => (
                <button key={t} type="button" disabled={started} onClick={() => setType(t)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all disabled:opacity-60 ${type === t ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}>
                  {TEMPLATE_TYPE_LABEL[t]}
                </button>
              ))}
            </div>
            {template ? <p className="text-xs text-slate-500 mt-1.5">Subject: {template.subject}</p> : <p className="text-xs text-rose-600 mt-1.5">This template does not exist.</p>}
          </div>

          {!started && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5"><Table2 className="w-3.5 h-3.5 inline mr-1" />Paste rows</label>
              <div className="text-xs text-slate-500 mb-2 bg-slate-50 rounded-lg p-2">
                Email [Tab] Name (optional) [Tab] Company (optional) — one email per line, straight from Excel.
                <br />[Name] and [Company Name] in the template are filled from the row.
              </div>
              <textarea value={text} onChange={e => setText(e.target.value)} rows={7}
                placeholder={'john@techcorp.com\tJohn Smith\tTechCorp\njane@datasys.com\tJane Doe\tDataSys\nali@nile.com'}
                className={`${TEXT_INPUT_CLASS} font-mono resize-none`} />
            </div>
          )}

          {text.trim() && (
            <div className="border border-slate-200 rounded-xl overflow-x-auto scrollbar-thin" aria-live="polite">
              <div className="min-w-[34rem]">
              <div className="grid grid-cols-[2rem_1.6fr_1fr_1fr_5.5rem] gap-2 px-3 py-2 bg-slate-50 text-xs font-semibold text-slate-600 border-b border-slate-200">
                <span>#</span><span>Email</span><span>Name</span><span>Company</span><span className="text-right">Status</span>
              </div>
              <div className="max-h-64 overflow-y-auto scrollbar-thin divide-y divide-slate-100">
                {parsed.accepted.map((r, i) => {
                  const sent = started && i < progress.done;
                  const sending = progress.running && i === progress.done;
                  return (
                    <div key={r.email} className="grid grid-cols-[2rem_1.6fr_1fr_1fr_5.5rem] gap-2 px-3 py-1.5 text-xs items-center">
                      <span className="text-slate-400">{i + 1}</span>
                      <span className="truncate text-slate-800">{r.email}</span>
                      <span className="truncate text-slate-600">{r.name || '—'}</span>
                      <span className="truncate text-slate-600">{r.company || '—'}</span>
                      <span className="text-right">
                        {sent ? <span className="text-emerald-600 inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Sent</span>
                          : sending ? <span className="text-blue-600 inline-flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Sending</span>
                          : <span className="text-slate-400">Ready</span>}
                      </span>
                    </div>
                  );
                })}
                {!started && parsed.rejected.slice(0, 50).map(r => (
                  <div key={`r${r.line}`} className="grid grid-cols-[2rem_1fr] gap-2 px-3 py-1.5 text-xs bg-rose-50 text-rose-700">
                    <span>{r.line}</span><span className="truncate"><span className="font-mono">{r.raw.trim()}</span> — {r.reason}</span>
                  </div>
                ))}
              </div>
              </div>
            </div>
          )}

          {text.trim() && !started && (
            <p className="text-xs"><span className="font-medium text-emerald-700">{parsed.accepted.length} ready</span>
              {parsed.rejected.length > 0 && <span className="font-medium text-rose-600"> · {parsed.rejected.length} with a problem (will be skipped)</span>}</p>
          )}
          {started && (
            <div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-violet-600 transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} /></div>
              <p className="text-xs text-slate-600 mt-1.5">
                {finished ? `Done: ${progress.done} of ${progress.total} sent.` : `Sending ${progress.done}/${progress.total}…`}
              </p>
            </div>
          )}
        </div>

        <div className="px-4 sm:px-6 py-4 border-t border-slate-100 flex justify-end gap-2 sticky bottom-0 bg-white">
          {finished ? (
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">Done</button>
          ) : progress.running ? (
            <button onClick={stop} className="px-4 py-2 rounded-lg text-sm font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 flex items-center gap-1.5"><Square className="w-3.5 h-3.5" />Stop</button>
          ) : (
            <>
              <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100">Cancel</button>
              <button onClick={handleSend} disabled={parsed.accepted.length === 0 || !template}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-40 transition-all flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5" />Send {parsed.accepted.length > 0 ? parsed.accepted.length : ''} emails
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
