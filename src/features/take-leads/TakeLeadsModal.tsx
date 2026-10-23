import { Download, Search, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { normalizeLeadCode } from '@/domain/lead/leadCode';
import { daysUntilTakeable, isInPool, planTakeFromPool, splitLeadIds } from '@/domain/lead/leadPool';
import type { ClaimResult } from '@/domain/lead/leadPool';
import type { Lead, User, Workflow } from '@/domain/types';
import { campaignLabel } from '@/domain/workflow/campaignLabel';
import { ClaimResultRow } from '@/features/take-leads/ClaimResultRow';

/**
 * How an agent gets leads. Agents do not create leads - the Admin does. Here the agent either
 *  1) types ONE full lead ID in the search box: the lead appears only when the ID matches exactly (the pool is never listed), or
 *  2) types / pastes lead IDs one under the other and all of them are taken at once.
 * Every ID gets a result: added, not found, or held by another agent (with the name).
 */
export function TakeLeadsModal({
  leads, users, workflows, me, onTake, onClose,
}: {
  leads: Lead[];
  users: User[];
  workflows: Workflow[];
  me: User;
  onTake: (leadIds: string[]) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<'search' | 'paste'>('search');
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [text, setText] = useState('');
  const [report, setReport] = useState<ClaimResult[] | null>(null);

  const nameOf = (id: string) => users.find(u => u.id === id)?.name ?? '';

  // ---- search tab: the agent must type the FULL id. The pool is never listed, so nothing shows until the id matches exactly ----
  // (upper / lower case, dashes and spaces do not matter: "ld-013" finds LD013, but "LD01" never finds LD013)
  const found = useMemo(() => {
    const q = normalizeLeadCode(query);
    if (!q) return { lead: null as Lead | null, heldBy: null as { code: string; name: string } | null };
    const lead = leads.find(l => isInPool(l) && normalizeLeadCode(l.leadCode) === q) ?? null;
    if (lead) return { lead, heldBy: null };
    const h = leads.find(x => !isInPool(x) && normalizeLeadCode(x.leadCode) === q);
    return { lead: null, heldBy: h ? { code: h.leadCode, name: h.agentId === me.id ? 'you' : nameOf(h.agentId) || 'another agent' } : null };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads, query, me.id, users]);
  const typed = normalizeLeadCode(query).length > 0;
  // another agent worked on this lead less than 15 days ago: it can be seen but not taken yet
  const lockedDays = found.lead ? daysUntilTakeable(found.lead, me.id) : 0;
  const pickedLeads = useMemo(() => leads.filter(l => picked.has(l.id) && isInPool(l) && daysUntilTakeable(l, me.id) === 0), [leads, picked, me.id]);

  const togglePick = (id: string) => setPicked(p => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  // ---- paste tab: live check of every ID ----
  const plan = useMemo(
    () => planTakeFromPool(splitLeadIds(text), leads, me.id, nameOf),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [text, leads, me.id, users],
  );
  const ready = plan.filter(r => r.status === 'ready');
  const problems = plan.filter(r => r.status !== 'ready');

  const takePicked = () => {
    const ids = pickedLeads.map(l => l.id);
    if (!ids.length) return;
    onTake(ids);
    setReport(planTakeFromPool(ids.map(id => ({ line: 0, code: leads.find(l => l.id === id)!.leadCode })), leads, me.id, nameOf));
    setPicked(new Set());
  };
  const takePasted = () => {
    if (!ready.length) return;
    onTake(ready.map(r => r.leadId!));
    setReport(plan);
    setText('');
  };

  const tabClass = (t: typeof tab) =>
    `px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === t ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-600 hover:text-slate-700'}`;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 animate-slide-up max-h-[92vh] max-h-[92dvh] flex flex-col">
        <div className="px-4 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Take Leads</h2>
            <p className="text-sm text-slate-600">Get leads from the shared pool into your work queue</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center" aria-label="Close">
            <XCircle className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        <div className="px-4 sm:px-6 border-b border-slate-100 flex gap-2">
          <button className={tabClass('search')} onClick={() => { setTab('search'); setReport(null); }}>Search by exact ID</button>
          <button className={tabClass('paste')} onClick={() => { setTab('paste'); setReport(null); }}>Type / paste IDs</button>
        </div>

        <div className="px-4 sm:px-6 py-4 overflow-y-auto scrollbar-thin flex-1 space-y-3">
          {report && (
            <div className="rounded-lg border border-slate-200 text-xs" aria-live="polite">
              <div className="px-3 py-2 bg-slate-50 font-medium text-slate-700 rounded-t-lg">
                {report.filter(r => r.status === 'ready').length} added
                {report.some(r => r.status !== 'ready') && ` · ${report.filter(r => r.status !== 'ready').length} not added`}
              </div>
              <ul className="max-h-44 overflow-y-auto scrollbar-thin divide-y divide-slate-100">
                {report.map((r, i) => <ClaimResultRow key={`${r.code}-${i}`} r={r} />)}
              </ul>
            </div>
          )}

          {tab === 'search' && (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  value={query} onChange={e => setQuery(e.target.value)} autoFocus
                  placeholder="Type the full lead ID, e.g. LD013"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {!typed && <p className="text-xs text-slate-600 bg-slate-50 rounded-lg p-2">Leads are not listed. Write the exact ID of the lead you want and it will show up here.</p>}

              {found.lead && lockedDays > 0 && (
                <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                  <span className="font-mono">{found.lead.leadCode}</span> was added by another agent in the last 15 days.
                  {lockedDays} day{lockedDays === 1 ? '' : 's'} left before you can add it.
                </p>
              )}

              {found.lead && lockedDays === 0 && (
                <label className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                  <input type="checkbox" checked={picked.has(found.lead.id)} onChange={() => togglePick(found.lead!.id)} />
                  <span className="font-mono text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded shrink-0">{found.lead.leadCode}</span>
                  <span className="truncate text-sm text-slate-900">{found.lead.companyName}</span>
                  <span className="ml-auto text-xs text-slate-500 shrink-0">{campaignLabel(workflows, found.lead.campaignCode)}</span>
                </label>
              )}

              {found.heldBy && (
                <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                  <span className="font-mono">{found.heldBy.code}</span> exists but is held by {found.heldBy.name}.
                </p>
              )}

              {typed && !found.lead && !found.heldBy && (
                <p className="text-sm text-slate-500 text-center py-3">No lead with this exact ID in the pool</p>
              )}

              {pickedLeads.length > 0 && (
                <div className="rounded-xl border border-blue-100 bg-blue-50/40">
                  <div className="px-3 py-2 text-xs font-medium text-blue-800">Selected ({pickedLeads.length})</div>
                  <ul className="divide-y divide-blue-100/70 max-h-40 overflow-y-auto scrollbar-thin">
                    {pickedLeads.map(l => (
                      <li key={l.id} className="flex items-center gap-2 px-3 py-1.5 text-sm">
                        <span className="font-mono text-xs bg-white text-slate-600 px-1.5 py-0.5 rounded shrink-0">{l.leadCode}</span>
                        <span className="truncate text-slate-800">{l.companyName}</span>
                        <button onClick={() => togglePick(l.id)} className="ml-auto text-xs text-slate-500 hover:text-rose-600 shrink-0" aria-label={`Unselect ${l.leadCode}`}>Remove</button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {tab === 'paste' && (
            <>
              <p className="text-xs text-slate-600 bg-slate-50 rounded-lg p-2">
                Write or paste the lead IDs one under the other. All of them are added automatically - no need to pick each one.
              </p>
              <textarea
                value={text} onChange={e => { setText(e.target.value); setReport(null); }}
                rows={7} autoFocus
                placeholder={'LD012\nLD013\nLD014'}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
              {plan.length > 0 && (
                <div className="text-xs space-y-1.5" aria-live="polite">
                  <p>
                    <span className="font-medium text-emerald-700">{ready.length} ready</span>
                    {problems.length > 0 && <span className="font-medium text-rose-600"> · {problems.length} with a problem</span>}
                  </p>
                  {problems.length > 0 && (
                    <ul className="max-h-32 overflow-y-auto scrollbar-thin rounded-lg bg-rose-50 border border-rose-100 divide-y divide-rose-100">
                      {problems.slice(0, 50).map((r, i) => <ClaimResultRow key={`${r.code}-${i}`} r={r} />)}
                      {problems.length > 50 && <li className="px-3 py-1.5 text-rose-600">…and {problems.length - 50} more</li>}
                    </ul>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-4 sm:px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100">Close</button>
          {tab === 'search' ? (
            <button onClick={takePicked} disabled={pickedLeads.length === 0}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" />
              {pickedLeads.length > 0 ? `Take ${pickedLeads.length} lead${pickedLeads.length === 1 ? '' : 's'}` : 'Take leads'}
            </button>
          ) : (
            <button onClick={takePasted} disabled={ready.length === 0}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" />
              {ready.length > 0 ? `Take ${ready.length} lead${ready.length === 1 ? '' : 's'}` : 'Take leads'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
