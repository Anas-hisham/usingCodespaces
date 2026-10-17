import { useState } from 'react';
import {
  CheckCircle2, Circle, X, Plus, Clock, User, AlertCircle,
  Check, Send,
} from 'lucide-react';
import { useStore, toggleTask, addTask } from '@/store';
import type { Task } from '@/types';

export function Tasks() {
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
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Tasks</h2>
          <p className="text-sm text-slate-500">
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
          <div className="text-center py-12 text-slate-400">
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
            <div key={task.id} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-start gap-3">
                {canToggle ? (
                  <button
                    onClick={() => dispatch(toggleTask({ taskId: task.id, userId: currentUser.id }))}
                    className="mt-0.5 shrink-0"
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-300 hover:text-slate-400" />
                    )}
                  </button>
                ) : (
                  <div className="mt-0.5 shrink-0">
                    <CheckCircle2 className={`w-5 h-5 ${completedCount === task.assignedTo.length ? 'text-green-600' : 'text-slate-300'}`} />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className={`font-semibold text-sm ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                      {task.title}
                    </h3>
                    {isOverdue && (
                      <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Overdue
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 mb-3">{task.description}</p>

                  <div className="flex items-center gap-4 text-xs text-slate-500">
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
                                done ? 'bg-green-50 text-green-700' : 'bg-slate-50 text-slate-500'
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
            dispatch(addTask(task));
            setShowCreate(false);
          }}
        />
      )}
    </div>
  );
}

function CreateTaskModal({
  currentUser, assignees, onClose, onCreate,
}: {
  currentUser: import('@/types').User;
  assignees: import('@/types').User[];
  onClose: () => void;
  onCreate: (task: Task) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [assignAll, setAssignAll] = useState(true);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);

  const assigneeLabel = currentUser.role === 'operation_manager' ? 'Team Leaders' : 'Agents';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-slide-up">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">New Task</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Title</label>
            <input
              type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Task title..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
            <textarea
              value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Task details..." rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Deadline</label>
            <input
              type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Assign To</label>
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => { setAssignAll(true); setSelectedAssignees([]); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${assignAll ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}
              >
                All {assigneeLabel}
              </button>
              <button
                onClick={() => setAssignAll(false)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${!assignAll ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}
              >
                Select Specific
              </button>
            </div>
            {!assignAll && (
              <div className="space-y-1.5 max-h-40 overflow-y-auto scrollbar-thin">
                {assignees.map(a => (
                  <label key={a.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedAssignees.includes(a.id)}
                      onChange={e => {
                        if (e.target.checked) setSelectedAssignees([...selectedAssignees, a.id]);
                        else setSelectedAssignees(selectedAssignees.filter(id => id !== a.id));
                      }}
                      className="rounded"
                    />
                    <span className="text-sm text-slate-700">{a.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100">Cancel</button>
          <button
            onClick={() => {
              if (!title.trim()) return;
              const assignedTo = assignAll ? assignees.map(a => a.id) : selectedAssignees;
              const task: Task = {
                id: crypto.randomUUID(),
                authorId: currentUser.id, authorName: currentUser.name,
                title, description,
                createdAt: new Date().toISOString(),
                deadline: deadline || new Date(Date.now() + 7 * 86400000).toISOString(),
                assignedTo, completedBy: [],
              };
              onCreate(task);
              setTitle(''); setDescription(''); setDeadline('');
            }}
            disabled={!title.trim() || (!assignAll && selectedAssignees.length === 0)}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 transition-all flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            Create Task
          </button>
        </div>
      </div>
    </div>
  );
}
