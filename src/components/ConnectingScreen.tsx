/* Praise Kier */
import React from 'react'
import { useHealth } from '../context/HealthContext'

export const ConnectingScreen: React.FC = () => {
  const { isHealthy, isChecking, retryCountdown, manualRetry } = useHealth()

  if (isHealthy) return null

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-md p-4 text-center"
    >
      <div className="max-w-md w-full border border-emerald-500/40 bg-slate-900/90 rounded-xl p-8 shadow-2xl shadow-emerald-950/50">
        <div className="inline-flex p-3 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 mb-5 animate-pulse">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <h2 className="text-xl font-bold tracking-tight text-emerald-400 uppercase font-mono mb-2">
          Conectando con Lumon…
        </h2>

        <p className="text-sm text-slate-300 mb-6">
          El servidor de Lumon Industries no responde en este momento. Reintentando la conexión
          automáticamente.
        </p>

        <div className="mb-6 p-3 bg-slate-950/80 rounded border border-slate-800 font-mono text-xs text-slate-400">
          {retryCountdown > 0 ? (
            <span>Próximo intento automático en {retryCountdown}s</span>
          ) : (
            <span>Reconectando con el terminal…</span>
          )}
        </div>

        <button
          onClick={manualRetry}
          disabled={isChecking}
          className="w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-slate-950 font-semibold rounded-lg font-mono text-sm transition-colors shadow-lg shadow-emerald-900/30"
        >
          {isChecking ? 'Verificando terminal…' : 'Reintentar a mano'}
        </button>
      </div>
    </div>
  )
}
