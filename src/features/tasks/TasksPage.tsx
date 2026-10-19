import { AlertCircle, Check, CheckCircle2, Circle, Clock, Plus, User } from 'lucide-react';
import { useState } from 'react';
import { CreateTaskModal } from '@/features/tasks/components/CreateTaskModal';
import { createTask, toggleTaskCompletion, useStore } from '@/store';

export function TasksPage() {
  const { state, dispatch } = useStore();
  const currentUser = state.users.find(u => u.id === state.currentUserId)!;
  const [showCreate, setShowCreate] = useState(false);

  const canCreate = currentUser.role === 'team_leader' || currentUser.role === 'operation_manager';
  const myTeam = state.teams.find(t => t.id === currentUser.teamId);

  const relevantTasks = state.tasks.filter(t => {
    if (currentUser.role === 'operation_manager') return t.authorId === currentUser.id || t.assignedTo.includes(currentUser.id);
    if (currentUser.role === 'team_leader') return t.assignedTo.includes(currentUser.id) || (t.authorId === currentUser.id);
    if (currentUser.role === 'agent') return t.assignedTo.includes(currentUser.id);
    return false;
  });

  const assignees = currentUser.role === 'operation_manager'
    ? state.users.filter(u => u.role === 'team_leader')
    : state.users.filter(u => myTeam?.agentIds.includes(u.id));

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Tasks</h2>
          <p className="text-sm text-slate-600">
            {currentUser.role === 'agent' ? 'Your assigned tasks' :
             currentUser.role === 'operation_manager' ? 'Assign tasks to team leaders' :
             'Assign tasks to your team agents'}
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            New Task
          </button>
        )}
      </div>

      <div className="space-y-4">
        {relevantTasks.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No tasks yet</p>
          </div>
        )}

        {relevantTasks.map(task => {
          const isCompleted = task.completedBy.includes(currentUser.id);
          const isOverdue = new Date(task.deadline) < new Date() && !isCompleted;
          const completedCount = task.completedBy.filter(id => task.assignedTo.includes(id)).length;
          const canToggle = task.assignedTo.includes(currentUser.id);

          return (
            <div key={task.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-start gap-3">
                {canToggle ? (
                  <button
                    onClick={() => dispatch(toggleTaskCompletion({ taskId: task.id, userId: currentUser.id }))}
                    className="mt-0.5 shrink-0"
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-300 hover:text-slate-500" />
                    )}
                  </button>
                ) : (
                  <div className="mt-0.5 shrink-0">
                    <CheckCircle2 className={`w-5 h-5 ${completedCount === task.assignedTo.length ? 'text-emerald-600' : 'text-slate-300'}`} />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className={`font-semibold text-sm ${isCompleted ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                      {task.title}
                    </h3>
                    {isOverdue && (
                      <span className="text-xs px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full font-medium flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Overdue
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 mb-3">{task.description}</p>

                  <div className="flex items-center gap-4 text-xs text-slate-600">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Due: {new Date(task.deadline).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {task.authorName}
                    </span>
                    <span>
                      {completedCount}/{task.assignedTo.length} completed
                    </span>
                  </div>

                  {currentUser.role !== 'agent' && (
                    <div className="mt-3 border-t border-slate-100 pt-3">
                      <div className="flex flex-wrap gap-1.5">
                        {task.assignedTo.map(id => {
                          const person = state.users.find(u => u.id === id);
                          const done = task.completedBy.includes(id);
                          return (
                            <div
                              key={id}
                              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs ${
                                done ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-600'
                              }`}
                            >
                              {done ? <Check className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                              {person?.name}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showCreate && (
        <CreateTaskModal
          currentUser={currentUser}
          assignees={assignees}
          onClose={() => setShowCreate(false)}
          onCreate={(task) => {
            dispatch(createTask(task));
            setShowCreate(false);
          }}
        />
      )}
    </div>
  );
}
