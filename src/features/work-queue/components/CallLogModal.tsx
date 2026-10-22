import { XCircle } from 'lucide-react';
import { useState } from 'react';
import type { CallType, Lead } from '@/domain/types';

export function CallLogModal({
  lead, onClose, onSave,
}: {
  lead: Lead;
  onClose: () => void;
  onSave: (type: CallType, description: string) => void;
}) {
  const [callType, setCallType] = useState<CallType>('nvm');
  const [description, setDescription] = useState('');

  const callTypes: { value: CallType; label: string; desc: string; color: string }[] = [
    { value: 'nvm', label: 'NVM', desc: 'No Voicemail', color: 'border-amber-300 bg-amber-50 text-amber-700' },
    { value: 'lvm', label: 'LVM', desc: 'Left Voicemail', color: 'border-amber-300 bg-amber-50 text-amber-700' },
    { value: 'discovery', label: 'Discovery', desc: 'Client Responded', color: 'border-emerald-300 bg-emerald-50 text-emerald-700' },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-slide-up max-h-modal overflow-y-auto scrollbar-thin">
        <div className="px-4 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Log Call</h2>
            <p className="text-sm text-slate-600">{lead.companyName} — {lead.contactName}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
            <XCircle className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        <div className="px-4 sm:px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Call Type</label>
            <div className="grid grid-cols-3 gap-2">
              {callTypes.map(ct => (
                <button
                  key={ct.value}
                  onClick={() => setCallType(ct.value)}
                  className={`p-3 rounded-xl border-2 text-center transition-all ${
                    callType === ct.value ? ct.color : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <div className="font-bold text-sm">{ct.label}</div>
                  <div className="text-xs mt-0.5 opacity-80">{ct.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Call Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What happened during the call?"
              rows={4}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:border-transparent resize-none"
            />
            <p className="text-xs text-slate-500 mt-1">Required — this will be used for AI analysis</p>
          </div>
        </div>

        <div className="px-4 sm:px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => onSave(callType, description)}
            disabled={!description.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            Save & Mark Complete
          </button>
        </div>
      </div>
    </div>
  );
}
