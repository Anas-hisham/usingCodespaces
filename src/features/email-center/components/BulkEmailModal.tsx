import { Send, X } from 'lucide-react';
import { useState } from 'react';
import type { EmailTemplate, Lead } from '@/domain/types';
import { findCurrentTouchPoint, stepLabel } from '@/domain/workflow/touchPoints';

/**
 * Optional shortcut (the main way to email is still writing it by hand).
 * Lists the agent's leads whose current step is a due EMAIL; the agent can send to all of them or pick some.
 * Sending marks that email step complete for every selected lead.
 */
export function BulkEmailModal({
  leads, templates, onClose, onSend,
}: {
  leads: Lead[];
  templates: EmailTemplate[];
  onClose: () => void;
  onSend: (leadIds: string[], subject: string, body: string) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [templateId, setTemplateId] = useState('');

  const allSelected = leads.length > 0 && selected.length === leads.length;
  const toggle = (id: string) => setSelected(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  const withoutEmail = leads.filter(l => selected.includes(l.id) && !l.email).length;

  const applyTemplate = (id: string) => {
    setTemplateId(id);
    const t = templates.find(x => x.id === id);
    if (t) { setSubject(t.subject); setBody(t.body); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 animate-slide-up max-h-[90vh] overflow-y-auto scrollbar-thin">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Email step leads</h2>
            <p className="text-sm text-slate-600">Leads whose current step is an email due today</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
            <X className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {leads.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">No leads are waiting on an email step right now.</p>
          ) : (
            <>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700">
                    Leads <span className="text-xs text-slate-500 font-normal">({selected.length}/{leads.length})</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setSelected(allSelected ? [] : leads.map(l => l.id))}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700"
                  >
                    {allSelected ? 'Clear all' : 'Select all'}
                  </button>
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto scrollbar-thin border border-slate-200 rounded-xl p-2">
                  {leads.map(l => {
                    const tp = findCurrentTouchPoint(l);
                    return (
                      <label key={l.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer">
                        <input type="checkbox" checked={selected.includes(l.id)} onChange={() => toggle(l.id)} className="rounded" />
                        <span className="text-xs font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">{l.leadCode}</span>
                        <span className="text-sm text-slate-700 truncate flex-1">{l.companyName}</span>
                        {tp && <span className="text-xs text-slate-500 shrink-0">{stepLabel(tp.order, tp.type)}</span>}
                        {!l.email && <span className="text-xs text-rose-500 shrink-0">no email</span>}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Template (optional)</label>
                <select
                  value={templateId} onChange={e => applyTemplate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="">Write it myself...</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Subject</label>
                <input
                  type="text" value={subject} onChange={e => setSubject(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Message</label>
                <textarea
                  value={body} onChange={e => setBody(e.target.value)} rows={7}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
                <p className="text-xs text-slate-500 mt-1">[Name], [Company Name] and [Agent Name] are filled in for each lead.</p>
              </div>

              {withoutEmail > 0 && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  {withoutEmail} selected lead{withoutEmail > 1 ? 's have' : ' has'} no email address saved.
                </p>
              )}
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100">Cancel</button>
          <button
            onClick={() => onSend(selected, subject, body)}
            disabled={selected.length === 0 || !subject.trim() || !body.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-40 transition-all flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            Send & Mark Complete ({selected.length})
          </button>
        </div>
      </div>
    </div>
  );
}
