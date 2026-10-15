import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, X, ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
  title?: string;
  fallbackMessage?: string;
  isModal?: boolean;
  onReset?: () => void;
  onCancel?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ImportErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ImportErrorBoundary] Caught preview error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public handleCancel = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onCancel) {
      this.props.onCancel();
    }
  };

  public render() {
    if (this.state.hasError) {
      const errorTitle = this.props.title || 'Unable to display Import Preview. Please try again.';
      const errorMessage =
        this.props.fallbackMessage ||
        'An unexpected data issue occurred while rendering the import preview. The rest of the application remains protected and fully operational.';

      if (this.props.isModal) {
        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl border border-rose-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="bg-rose-900 text-white px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <ShieldAlert className="w-5 h-5 text-rose-400" />
                  <h3 className="font-bold text-sm tracking-wide uppercase">Import Error Protection</h3>
                </div>
                {this.props.onCancel && (
                  <button
                    type="button"
                    onClick={this.handleCancel}
                    className="text-rose-200 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Body */}
              <div className="p-6">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-rose-100 rounded-lg text-rose-700 shrink-0">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-base font-bold text-slate-900 leading-snug">
                      {errorTitle}
                    </h4>
                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                      {errorMessage}
                    </p>

                    {this.state.error?.message && (
                      <div className="mt-3 p-2.5 bg-slate-50 rounded border border-slate-200 text-[11px] font-mono text-slate-700 break-words max-h-24 overflow-y-auto">
                        <span className="font-bold text-rose-700">Detail: </span>
                        {this.state.error.message}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  {this.props.onCancel && (
                    <button
                      type="button"
                      onClick={this.handleCancel}
                      className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-300 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={this.handleReset}
                    className="px-5 py-2 rounded-lg text-xs font-bold bg-blue-700 hover:bg-blue-800 text-white shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Import</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      }

      // Inline fallback
      return (
        <div className="p-6 bg-rose-50/80 border-2 border-rose-300 rounded-xl my-4 text-slate-800 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-rose-100 rounded-lg text-rose-700 shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h4 className="text-base font-bold text-rose-950">
                {errorTitle}
              </h4>
              <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                {errorMessage}
              </p>
              {this.state.error?.message && (
                <div className="mt-2.5 p-2 bg-white rounded border border-rose-200 font-mono text-[11px] text-rose-800 break-words">
                  {this.state.error.message}
                </div>
              )}
              <div className="mt-4 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={this.handleReset}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Import</span>
                </button>
                {this.props.onCancel && (
                  <button
                    type="button"
                    onClick={this.handleCancel}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

