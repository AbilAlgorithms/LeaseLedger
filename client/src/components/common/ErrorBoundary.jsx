import React from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught render error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/dashboard';
  };

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-lg border border-stone-200 p-8 text-center space-y-6 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <h2 className="font-serif text-2xl text-stone-900 font-bold">
                Something went wrong
              </h2>
              <p className="text-xs text-stone-600">
                An unexpected display error occurred while rendering this view. You can return to your dashboard or reload the page.
              </p>
              {this.state.error?.message && (
                <div className="p-2.5 bg-stone-50 rounded border border-stone-200 text-[11px] font-mono text-stone-600 text-left overflow-auto max-h-24">
                  {this.state.error.message}
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-4 py-2 text-xs font-semibold rounded bg-stone-900 text-white hover:bg-stone-800 transition-colors inline-flex items-center gap-1.5"
              >
                <Home className="w-3.5 h-3.5" />
                Return to Dashboard
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="px-4 py-2 text-xs font-semibold rounded border border-stone-300 text-stone-700 hover:bg-stone-50 transition-colors inline-flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
