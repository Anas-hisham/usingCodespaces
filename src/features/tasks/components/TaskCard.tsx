import { AlertCircle, Check, CheckCircle2, Circle, Clock, User } from 'lucide-react';
import type { Task, User as AppUser } from '@/domain/types';
import { Collapsible } from '@/shared/components/Collapsible';

/** One task card. */
export function TaskCard({ task, currentUser, users, onToggle }: {
  task: Task; currentUser: AppUser; users: AppUser[]; onToggle: () => void;
}) {
  const isCompleted = task.completedBy.includes(currentUser.id);
  const isOverdue = new Date(task.deadline) < new Date() && !isCompleted;
  const completedCount = task.completedBy.filter(id => task.assignedTo.includes(id)).length;
  const canToggle = task.assignedTo.includes(currentUser.id);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-start gap-3">
        {canToggle ? (
          <button onClick={onToggle} className="mt-0.5 shrink-0">
            {isCompleted ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <Circle className="w-5 h-5 text-slate-300 hover:text-slate-500" />}
          </button>
        ) : (
          <div className="mt-0.5 shrink-0">
            <CheckCircle2 className={`w-5 h-5 ${completedCount === task.assignedTo.length ? 'text-emerald-600' : 'text-slate-300'}`} />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={`font-semibold text-sm ${isCompleted ? 'text-slate-500 line-through' : 'text-slate-900'}`}>{task.title}</h3>
            {isOverdue && (
              <span className="text-xs px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full font-medium flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Overdue
              </span>
            )}
          </div>
          <p className="text-sm text-slate-600 mb-3">{task.description}</p>

          <div className="flex items-center gap-4 text-xs text-slate-600">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Due: {new Date(task.deadline).toLocaleDateString()}</span>
            <span className="flex items-center gap-1"><User className="w-3 h-3" />{task.authorName}</span>
            <span>{completedCount}/{task.assignedTo.length} completed</span>
          </div>

          {/* only the person who gave the task sees who got it and who finished it (the arrow opens / closes the list) */}
          {task.authorId === currentUser.id && task.assignedTo.length > 0 && (
            <Collapsible
              defaultOpen={false}
              className="mt-3 border-t border-slate-100 pt-3"
              header={<span className="text-xs font-medium text-slate-600">Assigned to {task.assignedTo.length} · {completedCount} done</span>}
            >
              <div className="flex flex-wrap gap-1.5 mt-2 pl-6">
                {task.assignedTo.map(id => {
                  const person = users.find(u => u.id === id);
                  const done = task.completedBy.includes(id);
                  return (
                    <div key={id} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs ${done ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-600'}`}>
                      {done ? <Check className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                      {person?.name}
                    </div>
                  );
                })}
              </div>
            </Collapsible>
          )}
        </div>
      </div>
    </div>
  );
}
