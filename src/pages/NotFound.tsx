/* Praise Kier */
import React from 'react'
import { Link } from 'react-router-dom'

export const NotFound: React.FC = () => {
  return (
    <div className="flex-1 flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full border border-slate-800 bg-slate-900/90 rounded-xl p-8 shadow-2xl">
        <div className="inline-flex p-3 rounded-full bg-slate-800 border border-slate-700 text-slate-400 mb-4">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <h1 className="text-4xl font-extrabold font-mono text-emerald-400 tracking-wider mb-2">
          404
        </h1>

        <h2 className="text-sm font-bold font-mono text-slate-200 uppercase tracking-widest mb-3">
          Sector No Encontrado
        </h2>

        <p className="text-xs text-slate-400 mb-6">
          La ruta solicitada no existe dentro de las particiones conocidas de Lumon Industries.
        </p>

        <Link
          to="/files"
          className="inline-block py-2.5 px-6 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-mono font-semibold rounded-lg text-xs tracking-wider uppercase transition-colors"
        >
          Retornar al Tablero MDR
        </Link>
      </div>
    </div>
  )
}
