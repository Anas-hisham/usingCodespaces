import { AlertCircle, Users as UsersIcon, X } from 'lucide-react';
import { useState } from 'react';
import type { TeamUpdate, UpdateAudience, User } from '@/domain/types';
import type { AppState } from '@/store/state/AppState';

export function CreateUpdateModal({
  currentUser, state, onClose, onCreate,
}: {
  currentUser: User;
  state: AppState;
  onClose: () => void;
  onCreate: (update: TeamUpdate) => void;
}) {
  const isOM = currentUser.role === 'operation_manager';
  const myTeam = state.teams.find(t => t.id === currentUser.teamId);

  const [audience, setAudience] = useState<UpdateAudience>(isOM ? 'all' : 'specific_team');
  const [selectedTeamId, setSelectedTeamId] = useState(myTeam?.id || state.teams[0]?.id || '');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const audienceOptions: { value: UpdateAudience; label: string; show: boolean }[] = [
    { value: 'all', label: 'Everyone (all TLs + all agents)', show: isOM },
    { value: 'team_leaders', label: 'All Team Leaders only', show: isOM },
    { value: 'specific_team', label: isOM ? 'Specific Team' : 'My Team Agents', show: true },
  ];

  const availableTeams = isOM ? state.teams : state.teams.filter(t => t.id === currentUser.teamId);

  const handleCreate = () => {
    if (!title.trim() || !content.trim()) return;
    const update: TeamUpdate = {
      id: crypto.randomUUID(),
      audience,
      teamId: audience === 'specific_team' ? selectedTeamId : null,
      authorId: currentUser.id,
      authorName: currentUser.name,
      title,
      content,
      createdAt: new Date().toISOString(),
      acknowledgedBy: [],
    };
    onCreate(update);
    setTitle(''); setContent('');
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-slide-up">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">New Update</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
            <X className="w-4 h-4 text-slate-600" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Audience</label>
            <div className="space-y-2">
              {audienceOptions.filter(o => o.show).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setAudience(opt.value)}
                  className={`w-full flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all ${
                    audience === opt.value ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <UsersIcon className={`w-4 h-4 ${audience === opt.value ? 'text-blue-600' : 'text-slate-500'}`} />
                  <span className="text-sm text-slate-700">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {audience === 'specific_team' && availableTeams.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Team</label>
              <select
                value={selectedTeamId}
                onChange={e => setSelectedTeamId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                {availableTeams.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Update title..."
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Content</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Write your update..."
              rows={5}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <AlertCircle className="w-3.5 h-3.5" />
            {audience === 'all' ? 'All team leaders and agents will see this' :
             audience === 'team_leaders' ? 'Only team leaders will see this' :
             'Agents in the selected team will see this'}
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100">Cancel</button>
          <button
            onClick={handleCreate}
            disabled={!title.trim() || !content.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 transition-all"
          >
            Send Update
          </button>
        </div>
      </div>
    </div>
  );
}
