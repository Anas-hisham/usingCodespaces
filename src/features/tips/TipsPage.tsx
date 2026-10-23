import { Check, Lightbulb, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Tip } from '@/domain/types';
import { SendTipModal } from '@/features/tips/components/SendTipModal';
import { DoneSection } from '@/shared/components/DoneSection';
import { Pagination } from '@/shared/components/Pagination';
import { usePagination } from '@/shared/hooks/usePagination';
import { acknowledgeTip, markTipsSeen, sendTips, useStore } from '@/store';

const TIPS_PER_PAGE = 5;

/** Quality writes advice for agents (this is advice, not a task). The agent reads it and presses "Got it". */
export function TipsPage() {
  const { state, dispatch } = useStore();
  const me = state.users.find(u => u.id === state.currentUserId)!;
  const isQuality = me.role === 'quality';
  const [showSend, setShowSend] = useState(false);

  const hasUnseen = state.tips.some(t => !t.seenBy.includes(me.id));
  useEffect(() => { if (hasUnseen) dispatch(markTipsSeen(me.id)); }, [hasUnseen, me.id, dispatch]);

  // Quality sees what it sent; an agent sees what was sent to him
  const mine = state.tips.filter(t => isQuality ? t.authorId === me.id : t.agentId === me.id);
  const open = usePagination(mine.filter(t => !t.acknowledgedAt), TIPS_PER_PAGE);
  const done = usePagination(mine.filter(t => !!t.acknowledgedAt), TIPS_PER_PAGE);
  const nameOf = (id: string) => state.users.find(u => u.id === id)?.name ?? '—';

  const renderTip = (t: Tip) => (
    <div key={t.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0"><Lightbulb className="w-4 h-4 text-amber-600" /></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-sm text-slate-900">{t.title}</h3>
            {!t.acknowledgedAt && !isQuality && <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse-ring" />}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {isQuality ? <>To <b className="font-medium text-slate-700">{nameOf(t.agentId)}</b></> : <>From <b className="font-medium text-slate-700">{t.authorName}</b></>}
            {' · '}{new Date(t.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
          <p className="text-sm text-slate-600 leading-relaxed mt-3">{t.content}</p>
          <div className="mt-3">
            {isQuality ? (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${t.acknowledgedAt ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                {t.acknowledgedAt ? 'Read by the agent' : 'Not read yet'}
              </span>
            ) : t.acknowledgedAt ? (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Got it</span>
            ) : (
              <button onClick={() => dispatch(acknowledgeTip(t.id))} className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-900 text-white hover:bg-slate-800 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />Got it
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Tips</h2>
          <p className="text-sm text-slate-600">{isQuality ? 'Send advice to agents to improve their calls' : 'Advice from the Quality team'}</p>
        </div>
        {isQuality && (
          <button onClick={() => setShowSend(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" />New Tip
          </button>
        )}
      </div>

      {mine.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <Lightbulb className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{isQuality ? 'You have not sent any tips yet' : 'No tips yet'}</p>
        </div>
      )}

      {mine.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-slate-800 mb-3">
            {isQuality ? 'Waiting to be read' : 'New'} <span className="ml-1 text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">{open.total}</span>
          </h3>
          {open.total === 0 ? (
            <p className="text-sm text-slate-500 bg-white rounded-xl border border-dashed border-slate-200 px-5 py-6 text-center">{isQuality ? 'Every tip was read.' : 'You are all caught up. 🎉'}</p>
          ) : (
            <div className="space-y-4">{open.pageItems.map(renderTip)}</div>
          )}
          <Pagination {...open} onPage={open.setPage} />
        </section>
      )}

      <DoneSection title={isQuality ? 'Read' : 'Got it'} count={done.total}>
        <div className="space-y-4">{done.pageItems.map(renderTip)}</div>
        <Pagination {...done} onPage={done.setPage} />
      </DoneSection>

      {showSend && (
        <SendTipModal
          teams={state.teams.map(t => ({ ...t, agentIds: t.agentIds.filter(id => state.users.find(u => u.id === id)?.qualityId === me.id) })).filter(t => t.agentIds.length > 0)} users={state.users} onClose={() => setShowSend(false)}
          onSend={(agentIds, title, content) => { dispatch(sendTips({ agentIds, title, content })); setShowSend(false); }}
        />
      )}
    </div>
  );
}
