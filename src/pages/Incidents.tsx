/* Praise Kier */
import React from 'react'

export const Incidents: React.FC = () => {
  return (
    <div className="flex-1 p-6 max-w-7xl mx-auto w-full font-mono">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-wider text-emerald-400 uppercase">
          Reportes de Incidencias
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Piso de Pruebas · Registro y documentación gráfica de eventos anómalos.
        </p>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-8 text-center">
        <p className="text-sm text-slate-300 mb-2">Módulo en preparación para el Checkpoint 4.</p>
        <p className="text-xs text-slate-500">
          Requiere aprobación de la revisión automática de Clearance en la pantalla de Estado.
        </p>
      </div>
    </div>
  )
}
