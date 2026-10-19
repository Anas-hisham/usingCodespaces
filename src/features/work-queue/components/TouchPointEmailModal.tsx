import { Send, XCircle } from 'lucide-react';
import { useState } from 'react';
import type { EmailTemplate, Lead } from '@/domain/types';
import type { QueueCategory } from '@/domain/workflow/callClassification';

export function TouchPointEmailModal({
  lead, category, templates, onClose, onSend,
}: {
  lead: Lead;
  category: QueueCategory;
  templates: EmailTemplate[];
  onClose: () => void;
  onSend: (to: string, subject: string, body: string, templateType: 'discovery' | 'no_response' | 'custom') => void;
}) {
  // Writing the email by hand is the main way; a template is only an optional starting point.
  const suggestedType = category === 'discovery' ? 'discovery' : 'no_response';
  const [templateType, setTemplateType] = useState<'discovery' | 'no_response' | 'custom'>('custom');
  const [to, setTo] = useState(lead.email || '');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const applyTemplate = (type: 'discovery' | 'no_response' | 'custom') => {
    setTemplateType(type);
    const t = templates.find(x => x.type === type);
    if (type !== 'custom' && t) { setSubject(t.subject); setBody(t.body); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 animate-slide-up max-h-[90vh] overflow-y-auto scrollbar-thin">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Send Email</h2>
            <p className="text-sm text-slate-600">{lead.companyName} — {lead.contactName}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
            <XCircle className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">Start from:</span>
            {([['custom', 'Blank'], [suggestedType, suggestedType === 'discovery' ? 'Discovery template' : 'No Response template']] as const).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => applyTemplate(val)}
                className={`px-2.5 py-1 rounded-full font-medium transition-all ${
                  templateType === val ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">To</label>
            <input
              type="email"
              value={to}
              onChange={e => setTo(e.target.value)}
              placeholder="recipient@example.com"
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Message</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={8}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:border-transparent resize-none font-mono"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => onSend(to, subject, body, templateType)}
            disabled={!to.trim() || !subject.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            Send & Mark Complete
          </button>
        </div>
      </div>
    </div>
  );
}
