import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { CLAIM_STATUS_TEXT } from '@/domain/lead/leadPool';
import type { ClaimResult } from '@/domain/lead/leadPool';

/** One line of the result list: the ID and what happened to it. */
export function ClaimResultRow({ r }: { r: ClaimResult }) {
  const ok = r.status === 'ready';
  const text = r.status === 'taken' ? `Held by ${r.holderName}`
    : r.status === 'recently_worked' ? `${CLAIM_STATUS_TEXT.recently_worked} - ${r.daysLeft} day${r.daysLeft === 1 ? '' : 's'} left before you can add it`
    : CLAIM_STATUS_TEXT[r.status];
  return (
    <li className={`px-3 py-1.5 flex items-center gap-2 ${ok ? 'text-emerald-700' : 'text-rose-700'}`}>
      {ok ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
      <span className="font-mono">{r.code}</span>
      <span className="ml-auto text-right">{ok ? 'Added' : text}</span>
    </li>
  );
}
