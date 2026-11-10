/* Praise Kier */
import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Lumon Boundary caught error:', error, errorInfo)
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null })
    window.location.href = '/files'
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full border border-red-500/40 bg-slate-900/90 rounded-xl p-8 shadow-2xl">
            <div className="inline-flex p-3 rounded-full bg-red-950/60 border border-red-500/30 text-red-400 mb-4">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold font-mono text-red-400 uppercase tracking-wider mb-2">
              Anomalía en el Terminal
            </h2>
            <p className="text-sm text-slate-300 mb-4">
              Se ha producido un error inesperado al renderizar la vista de Macrodata Refinement.
            </p>
            {this.state.error && (
              <pre className="text-xs bg-slate-950 p-3 rounded text-red-300 font-mono overflow-x-auto text-left mb-6 border border-slate-800">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={this.handleReset}
              className="w-full px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-mono font-semibold rounded-lg text-sm transition-colors"
            >
              Volver al Refinamiento
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
