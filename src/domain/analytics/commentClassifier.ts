/** Classifies an agent's comment into a call reason (structured reason always wins). */
import { pct } from '@/domain/analytics/performanceMetrics';
import type { CallReason, Lead } from '@/domain/types';

// ---------------------------------------------------------------------------
// Comment intelligence (light): classify the agent's comment into a reason.
// A structured `reason` on the call always wins; keywords are only the fallback for free text.
// ---------------------------------------------------------------------------
export const REASON_LABEL: Record<CallReason, string> = {
  interested: 'Interested', callback: 'Call back later', price: 'Price', timing: 'Timing',
  not_interested: 'Not interested', wrong_contact: 'Wrong contact', no_answer: 'No answer', voicemail: 'Voicemail / third person', other: 'Other',
};

const REASON_KEYWORD_RULES: [CallReason, RegExp][] = [
  ['wrong_contact', /wrong (number|contact|person)|left the company|رقم غلط|مش هو|ساب الشركة/i],
  ['not_interested', /not interested|no interest|refus|declin|مش مهتم|مش عايز|رفض/i],
  ['price', /pric|cost|expensive|discount|budget|سعر|غالي|تكلف|خصم/i],
  ['callback', /call ?back|later|ring back|كلمني|بعدين|اتصل تاني/i],
  ['timing', /next (week|month|quarter)|not now|busy|الشهر الجاي|مشغول|مش دلوقتي/i],
  ['interested', /interest|agree|wants|requested|confirm|great|مهتم|موافق|عايز/i],
  ['no_answer', /no answer|nobody|didn.t answer|مفيش رد|محدش رد/i],
  ['voicemail', /voicemail|assistant|secretary|message|سكرتير/i],
];

export function classifyComment(text: string, type: 'nvm' | 'lvm' | 'discovery'): CallReason {
  for (const [reason, re] of REASON_KEYWORD_RULES) if (re.test(text)) return reason;
  return type === 'nvm' ? 'no_answer' : type === 'lvm' ? 'voicemail' : 'other';
}

export function reasonCounts(leads: Lead[]): { reason: CallReason; count: number; share: number }[] {
  const counts = new Map<CallReason, number>();
  let total = 0;
  for (const l of leads) for (const c of l.callLogs) {
    const r = c.reason ?? classifyComment(c.description, c.type);
    counts.set(r, (counts.get(r) ?? 0) + 1); total++;
  }
  return [...counts.entries()].map(([reason, count]) => ({ reason, count, share: pct(count, total) })).sort((a, b) => b.count - a.count);
}
