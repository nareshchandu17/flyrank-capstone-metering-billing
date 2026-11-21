import React from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-white border border-[#e3e8ee] rounded-2xl p-8 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-semibold text-[#0d253d] mb-1">
              Unable to render this page
            </h2>
            <p className="text-xs text-[#64748d] mb-4 leading-relaxed">
              An unexpected error occurred while loading this view. The application layout remains intact.
            </p>
            {this.state.error && (
              <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-xl text-left overflow-auto max-h-48">
                <div className="text-xs font-mono font-semibold text-red-800">
                  {this.state.error.name || 'Error'}: {this.state.error.message || String(this.state.error)}
                </div>
                {this.state.error.stack && (
                  <pre className="text-[10px] font-mono text-red-600 mt-2 whitespace-pre-wrap leading-tight">
                    {this.state.error.stack.split('\n').slice(0, 6).join('\n')}
                  </pre>
                )}
              </div>
            )}
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => this.setState({ hasError: false, error: null })}
                className="btn-secondary-pill text-xs py-2 px-4"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1 text-[#4D7C0F]" />
                Try Again
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="btn-primary-pill text-xs py-2 px-4"
              >
                <Home className="w-3.5 h-3.5 mr-1" />
                Return to Overview
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
