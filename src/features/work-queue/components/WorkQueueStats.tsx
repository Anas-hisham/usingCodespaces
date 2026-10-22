interface WorkQueueStatsProps {
  todayTotal: number;
  overdueCount: number;
  nextTotal: number;
  stoppedTotal: number;
  meetingsTodayCount: number;
}

/** The five numbers at the top of the work queue. */
export function WorkQueueStats({ todayTotal, overdueCount, nextTotal, stoppedTotal, meetingsTodayCount }: WorkQueueStatsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
      <div className="bg-white rounded-xl border border-blue-200 p-4">
        <div className="text-sm text-slate-600 mb-1">Today</div>
        <div className="text-2xl font-bold text-blue-600">{todayTotal}</div>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="text-sm text-slate-600 mb-1">Overdue</div>
        <div className="text-2xl font-bold text-rose-600">{overdueCount}</div>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="text-sm text-slate-600 mb-1">Next</div>
        <div className="text-2xl font-bold text-slate-700">{nextTotal}</div>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="text-sm text-slate-600 mb-1">Stopped</div>
        <div className="text-2xl font-bold text-amber-600">{stoppedTotal}</div>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 col-span-2 lg:col-span-1">
        <div className="text-sm text-slate-600 mb-1">Meetings Today</div>
        <div className="text-2xl font-bold text-violet-600">{meetingsTodayCount}</div>
      </div>
    </div>
  );
}
