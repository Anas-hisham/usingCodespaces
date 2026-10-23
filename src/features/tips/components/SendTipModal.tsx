import { Lightbulb, X } from 'lucide-react';
import { useState } from 'react';
import type { Team, User } from '@/domain/types';
import { Collapsible } from '@/shared/components/Collapsible';

/** Quality writes one piece of advice and picks the agents it is for (team by team, the arrow opens a team). */
export function SendTipModal({ teams, users, onClose, onSend }: {
  teams: Team[]; users: User[]; onClose: () => void;
  onSend: (agentIds: string[], title: string, content: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  const agentsOf = (t: Team) => t.agentIds.map(id => users.find(u => u.id === id)).filter((u): u is User => !!u);
  const toggle = (id: string) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const toggleTeam = (t: Team) => {
    const ids = t.agentIds;
    const all = ids.every(id => selected.includes(id));
    setSelected(s => all ? s.filter(id => !ids.includes(id)) : [...new Set([...s, ...ids])]);
  };
  const input = 'w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-slide-up max-h-[92vh] max-h-[92dvh] flex flex-col">
        <div className="px-4 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Lightbulb className="w-5 h-5 text-amber-500" />New Tip</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"><X className="w-4 h-4 text-slate-600" /></button>
        </div>
        <div className="px-4 sm:px-6 py-5 space-y-4 overflow-y-auto scrollbar-thin">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Open the call with the customer's name" className={input} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Advice</label>
            <textarea value={content} onChange={e => setContent(e.target.value)} rows={4} placeholder="What should the agent do differently?" className={`${input} resize-none`} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Send to <span className="text-xs font-normal text-slate-500">({selected.length} selected)</span></label>
            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-60 overflow-y-auto scrollbar-thin">
              {teams.map(t => {
                const agents = agentsOf(t);
                const all = agents.length > 0 && agents.every(a => selected.includes(a.id));
                return (
                  <Collapsible
                    key={t.id} defaultOpen={false} headerClassName="px-3 py-2 hover:bg-slate-50"
                    header={
                      <span className="flex items-center gap-2">
                        <input type="checkbox" checked={all} onClick={e => e.stopPropagation()} onChange={() => toggleTeam(t)} className="rounded" aria-label={`Select all of ${t.name}`} />
                        <span className="text-sm font-medium text-slate-800">{t.name}</span>
                        <span className="ml-auto text-xs text-slate-500">{agents.filter(a => selected.includes(a.id)).length}/{agents.length}</span>
                      </span>
                    }
                  >
                    <div className="pb-2 pl-9 pr-3 space-y-0.5">
                      {agents.map(a => (
                        <label key={a.id} className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-50 cursor-pointer">
                          <input type="checkbox" checked={selected.includes(a.id)} onChange={() => toggle(a.id)} className="rounded" />
                          <span className="text-sm text-slate-700">{a.name}</span>
                        </label>
                      ))}
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          </div>
        </div>
        <div className="px-4 sm:px-6 py-4 border-t border-slate-100 flex justify-end gap-2 shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100">Cancel</button>
          <button
            onClick={() => onSend(selected, title, content)}
            disabled={!title.trim() || !content.trim() || selected.length === 0}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 transition-all"
          >
            Send Tip
          </button>
        </div>
      </div>
    </div>
  );
}
