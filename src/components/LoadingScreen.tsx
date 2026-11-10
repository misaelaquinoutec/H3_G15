/* Praise Kier */
import React from 'react'

export const LoadingScreen: React.FC<{ message?: string }> = ({
  message = 'Iniciando terminal de Macrodata Refinement…',
}) => {
  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-slate-950 p-6 text-center select-none">
      <div className="w-16 h-16 mb-6 relative flex items-center justify-center">
        <div className="absolute inset-0 border-2 border-emerald-500/20 rounded-full animate-ping" />
        <div className="w-12 h-12 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>

      <div className="font-mono text-emerald-400 font-bold tracking-wider uppercase text-sm mb-2">
        Lumon Industries
      </div>

      <p className="text-xs text-slate-400 font-mono animate-pulse">{message}</p>
    </div>
  )
}
