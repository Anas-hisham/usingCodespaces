import { roleLabel } from '@/domain/user/roleLabel';
import { Calendar, Check, Mail, Phone, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import type { User } from '@/domain/types';
import { setCurrentUser, useStore } from '@/store';

export function LoginPage({ onLogin }: { onLogin: () => void }) {
  const { state, dispatch } = useStore();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    if (selectedUser) {
      dispatch(setCurrentUser(selectedUser.id));
      onLogin();
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-[46%] bg-slate-950 relative overflow-hidden">
        <div className="absolute -top-32 -left-24 w-[26rem] h-[26rem] bg-blue-600/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-20 w-[28rem] h-[28rem] bg-cyan-500/15 rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-14 text-white w-full">
          <div>
            <div className="flex items-center gap-3 mb-14">
              <div className="w-11 h-11 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight">SalesFlow</span>
            </div>
            <h1 className="text-4xl xl:text-[2.6rem] font-extrabold leading-[1.15] tracking-tight mb-4">
              Unified Sales<br />Management Platform
            </h1>
            <p className="text-slate-300 text-base leading-relaxed max-w-md">
              Manage leads, workflows, touch points, meetings, and team communication — all in one place.
            </p>

            {/* The lead statuses people will see all day, shown in the same colours the app uses */}
            <div className="mt-10 flex flex-wrap gap-2 max-w-md">
              {[
                { label: 'New', dot: 'bg-slate-400' },
                { label: 'Discovery', dot: 'bg-emerald-400' },
                { label: 'LVM', dot: 'bg-amber-400' },
                { label: 'NVM', dot: 'bg-amber-400' },
                { label: 'No Response', dot: 'bg-rose-400' },
                { label: 'Meeting', dot: 'bg-violet-400' },
              ].map(s => (
                <span key={s.label} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-slate-200">
                  <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                  {s.label}
                </span>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            {[
              { icon: Phone, text: 'Structured call workflows with touch points' },
              { icon: Mail, text: 'Automated email templates and bulk sending' },
              { icon: Calendar, text: 'Meeting scheduling with calendar integration' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-slate-300">
                <div className="w-9 h-9 bg-white/5 rounded-lg flex items-center justify-center border border-white/10">
                  <item.icon className="w-4 h-4 text-blue-300" />
                </div>
                <span className="text-sm">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right login panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">SalesFlow</span>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-1">Welcome back</h2>
          <p className="text-slate-600 text-sm mb-6">Select your profile to sign in</p>

          {/* User selection grid */}
          <div className="space-y-1.5 mb-5" role="radiogroup" aria-label="Profile">
            {state.users.map(user => {
              const selected = selectedUser?.id === user.id;
              return (
                <button
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  role="radio"
                  aria-checked={selected}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl border transition-all text-left ${
                    selected
                      ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
                    style={{ backgroundColor: user.color }}
                  >
                    {user.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 text-sm truncate">{user.name}</div>
                    <div className="text-xs text-slate-600 truncate">@{user.username}</div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${selected ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                    {roleLabel(user.role)}
                  </span>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${selected ? 'bg-blue-600' : 'border border-slate-300'}`}>
                    {selected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Password field (visual only) */}
          <div className="mb-5">
            <label htmlFor="login-password" className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
            />
          </div>

          <button
            onClick={handleLogin}
            disabled={!selectedUser}
            className="w-full py-3 bg-blue-600 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors active:scale-[0.99]"
          >
            {selectedUser ? `Sign in as ${selectedUser.name.split(' ')[0]}` : 'Sign In'}
          </button>

          <p className="text-center text-xs text-slate-500 mt-6">
            This is a visual prototype — no real authentication
          </p>
        </div>
      </div>
    </div>
  );
}
