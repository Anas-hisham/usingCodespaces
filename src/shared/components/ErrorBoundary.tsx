import { AlertTriangle } from 'lucide-react';
import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

/**
 * Last line of defence: if any screen throws while rendering, show a clear message with a way out
 * instead of a blank white page. The saved data is NOT touched.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) { return { error }; }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Screen crashed:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-center">
          <div className="w-11 h-11 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-3">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
          </div>
          <h1 className="text-lg font-bold text-slate-900 mb-1">Something went wrong</h1>
          <p className="text-sm text-slate-600 mb-5">
            This screen hit an unexpected error. Your data is safe — nothing was deleted.
          </p>
          <div className="flex justify-center gap-2">
            <button
              onClick={() => this.setState({ error: null })}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Try again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              Reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}
