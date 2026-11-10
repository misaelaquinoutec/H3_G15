/* Praise Kier */
import React from 'react'
import { Link, useLocation } from 'react-router-dom'

export const Unauthorized: React.FC = () => {
  const location = useLocation()
  const state = (location.state as any) || {}
  const isClearance = state.reason === 'CLEARANCE_REQUIRED'
  const permission = state.permission

  return (
    <div className="flex-1 flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full border border-amber-500/30 bg-slate-900/90 rounded-xl p-8 shadow-2xl">
        <div className="inline-flex p-3 rounded-full bg-amber-950/50 border border-amber-500/30 text-amber-400 mb-5">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>

        <h1 className="text-xl font-bold font-mono text-amber-400 uppercase tracking-wider mb-2">
          {isClearance ? 'Clearance Requerida' : 'Acceso No Autorizado'}
        </h1>

        <p className="text-sm text-slate-300 mb-6">
          {isClearance
            ? 'Esta sección pertenece al Piso de Pruebas. Tu cuadrilla debe aprobar la revisión automática desde la pantalla de Estado antes de poder acceder.'
            : permission
            ? `Tu rol actual no posee el permiso necesario (${permission}) para ejecutar esta operación.`
            : 'No cuentas con los permisos requeridos por Lumon Industries para visualizar este expediente o recurso.'}
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          {isClearance && (
            <Link
              to="/estado"
              className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-mono font-semibold rounded-lg text-xs tracking-wider uppercase transition-colors"
            >
              Ir a Estado del Sistema
            </Link>
          )}
          <Link
            to="/files"
            className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-mono font-semibold rounded-lg text-xs tracking-wider uppercase transition-colors"
          >
            Volver a Archivos
          </Link>
        </div>
      </div>
    </div>
  )
}
