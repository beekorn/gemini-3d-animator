import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children?: ReactNode;
  resetKey?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.props.resetKey !== prevProps.resetKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  public render() {
    if (this.state.hasError) {
       const errorMsg = this.state.error?.message || '';
       const isZipError = errorMsg.includes('PK') || errorMsg.includes('Unexpected token') || errorMsg.includes('not valid JSON');
       return (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-50 p-6">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
               <span className="text-3xl">⚠️</span>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">{isZipError ? 'Failed to Load Model' : 'Something went wrong'}</h2>
            <p className="text-slate-400 mb-6 text-sm">
              {isZipError ? "It looks like you might have uploaded a ZIP file. Please extract it and upload the .glb or .fbx file directly." : "There was an unexpected error. Finish what you were doing."}
            </p>
            <button onClick={() => this.setState({ hasError: false, error: null })} className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors">
              Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}