import { useState } from 'react';
import { Phone, Mail, Calendar, ChevronRight, TrendingUp } from 'lucide-react';
import { useStore, setUser } from '@/store';
import type { User } from '@/types';

export function Login({ onLogin }: { onLogin: () => void }) {
  const { state, dispatch } = useStore();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    if (selectedUser) {
      dispatch(setUser(selectedUser.id));
      onLogin();
    }
  };

  const roleLabel = (role: string) => {
    switch (role) {
      case 'operation_manager': return 'Operation Manager';
      case 'team_leader': return 'Team Leader';
      case 'agent': return 'Agent';
      case 'quality': return 'Quality';
      default: return role;
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-blue-400 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-teal-400 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div>
            <div className="flex items-center gap-3 mb-12">
              <div className="w-11 h-11 bg-white/10 backdrop-blur rounded-xl flex items-center justify-center border border-white/20">
                <TrendingUp className="w-6 h-6 text-blue-300" />
              </div>
              <span className="text-xl font-semibold tracking-tight">SalesFlow</span>
            </div>
            <h1 className="text-4xl font-bold leading-tight mb-4">
              Unified Sales<br />Management Platform
            </h1>
            <p className="text-blue-200/80 text-lg leading-relaxed max-w-md">
              Manage leads, workflows, touch points, meetings, and team communication — all in one place.
            </p>
          </div>
          <div className="space-y-4">
            {[
              { icon: Phone, text: 'Structured call workflows with touch points' },
              { icon: Mail, text: 'Automated email templates and bulk sending' },
              { icon: Calendar, text: 'Meeting scheduling with calendar integration' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-blue-100/90">
                <div className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center border border-white/10">
                  <item.icon className="w-4 h-4" />
                </div>
                <span className="text-sm">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right login panel */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 px-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-semibold text-slate-900">SalesFlow</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-1">Welcome back</h2>
          <p className="text-slate-500 text-sm mb-8">Select your profile to sign in</p>

          {/* User selection grid */}
          <div className="space-y-2 mb-6">
            {state.users.map(user => (
              <button
                key={user.id}
                onClick={() => setSelectedUser(user)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                  selectedUser?.id === user.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
                  style={{ backgroundColor: user.color }}
                >
                  {user.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 text-sm truncate">{user.name}</div>
                  <div className="text-xs text-slate-500">@{user.username} • {roleLabel(user.role)}</div>
                </div>
                {selectedUser?.id === user.id && (
                  <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center shrink-0">
                    <ChevronRight className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Password field (visual only) */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          <button
            onClick={handleLogin}
            disabled={!selectedUser}
            className="w-full py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
          >
            Sign In
          </button>

          <p className="text-center text-xs text-slate-400 mt-6">
            This is a visual prototype — no real authentication
          </p>
        </div>
      </div>
    </div>
  );
}
