/* Praise Kier */
import React from 'react'
import { Link, useLocation, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ConnectingScreen } from './ConnectingScreen'

export const Layout: React.FC = () => {
  const { user, authMe, logout, revocationReason, clearRevocationReason, hasPermission } =
    useAuth()
  const location = useLocation()
  const isRefinePage = location.pathname.includes('/refine')

  const navItems = [
    { name: 'Archivos (MDR)', path: '/files', permission: 'files:read' },
    { name: 'Expedientes', path: '/refiners', permission: 'refiners:read' },
    { name: 'Incidencias', path: '/incidents', permission: 'incidents:read' },
    { name: 'Estado del Sistema', path: '/estado' },
  ]

  return (
    <div
      className={`min-h-screen ${
        isRefinePage ? 'h-screen overflow-hidden' : ''
      } bg-slate-950 text-slate-100 flex flex-col font-sans`}
    >
      <ConnectingScreen />

      {/* Revocation notification */}
      {revocationReason && (
        <div
          role="alert"
          className="bg-amber-500/20 border-b border-amber-500/40 px-4 py-2 text-center text-xs font-mono text-amber-300 flex items-center justify-between"
        >
          <span className="mx-auto">⚠️ Aviso de Seguridad: {revocationReason}</span>
          <button
            onClick={clearRevocationReason}
            className="text-amber-400 hover:text-amber-200 font-bold px-2 py-0.5 rounded text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Lumon Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <Link to="/files" className="flex items-center space-x-3 group">
              <div className="w-8 h-8 rounded border border-emerald-500/50 bg-emerald-950/60 flex items-center justify-center text-emerald-400 font-mono font-bold text-sm group-hover:border-emerald-400 transition-colors">
                MDR
              </div>
              <div className="flex flex-col">
                <span className="font-mono text-xs font-bold tracking-widest text-emerald-400 uppercase">
                  Lumon Industries
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Macrodata Refinement
                </span>
              </div>
            </Link>

            {/* Navigation Links */}
            <nav className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const isPermitted = !item.permission || hasPermission(item.permission)
                const isActive = location.pathname.startsWith(item.path)

                if (!isPermitted) return null

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
                      isActive
                        ? 'bg-emerald-500/15 text-emerald-400 font-semibold border border-emerald-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    {item.name}
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* User & Terminal State */}
          <div className="flex items-center space-x-4">
            {authMe && (
              <div className="hidden sm:flex items-center space-x-3 text-xs font-mono">
                {/* Team Badge */}
                <div className="px-2.5 py-1 bg-slate-800/80 border border-slate-700/60 rounded text-slate-300">
                  <span className="text-slate-500">Cuadrilla: </span>
                  <span className="font-semibold text-emerald-400">{authMe.team.code}</span>
                </div>

                {/* Clearance Badge */}
                <div
                  className={`px-2.5 py-1 border rounded ${
                    authMe.clearance?.granted
                      ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                      : 'bg-amber-950/40 border-amber-500/30 text-amber-300'
                  }`}
                  title={
                    authMe.clearance?.granted
                      ? 'Piso de Pruebas Desbloqueado'
                      : 'Clearance requerida para el Piso de Pruebas'
                  }
                >
                  {authMe.clearance?.granted ? '🔓 Piso Abierto' : '🔒 Piso Bloqueado'}
                </div>
              </div>
            )}

            {user && (
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-400 font-mono hidden lg:inline">
                  {user.displayName}
                </span>
                <button
                  onClick={logout}
                  className="px-3 py-1.5 text-xs font-mono rounded bg-slate-800 hover:bg-red-950/60 hover:text-red-300 text-slate-300 border border-slate-700 hover:border-red-500/40 transition-colors"
                >
                  Salir
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <Outlet />
      </main>

      {/* Lumon Footer - hidden on refine page */}
      {!isRefinePage && (
        <footer className="border-t border-slate-900 bg-slate-950 py-3 px-4 text-center text-[10px] text-slate-400 font-mono shrink-0">
          <span>Lumon Industries &copy; 2026 · El trabajo es misterioso e importante</span>
        </footer>
      )}
    </div>
  )
}
