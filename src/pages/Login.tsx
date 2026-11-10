/* Praise Kier */
import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LumonApiError } from '../api/types'

export const Login: React.FC = () => {
  const { login, revocationReason, clearRevocationReason } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const redirectTarget = (location.state as any)?.from || '/files'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setIsSubmitting(true)

    try {
      await login({ email, password })
      navigate(redirectTarget, { replace: true })
    } catch (err: any) {
      if (err instanceof LumonApiError) {
        setErrorMessage(err.message || 'Credenciales inválidas.')
      } else {
        setErrorMessage('No se pudo conectar con el servidor.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-emerald-500 selection:text-slate-950">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex w-14 h-14 rounded-xl border border-emerald-500/40 bg-emerald-950/40 items-center justify-center text-emerald-400 font-mono font-bold text-xl shadow-lg shadow-emerald-950/40 mb-4">
          MDR
        </div>
        <h1 className="text-2xl font-bold font-mono tracking-wider text-emerald-400 uppercase">
          Lumon Industries
        </h1>
        <p className="mt-1 text-xs text-slate-400 font-mono">
          Consola de Acceso · Macrodata Refinement
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-8 shadow-2xl backdrop-blur-md">
          {revocationReason && (
            <div
              role="alert"
              className="mb-6 p-3 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono flex items-center justify-between"
            >
              <span>{revocationReason}</span>
              <button
                type="button"
                onClick={clearRevocationReason}
                className="text-amber-400 hover:text-amber-200 font-bold ml-2"
                aria-label="Cerrar aviso"
              >
                ✕
              </button>
            </div>
          )}

          {errorMessage && (
            <div
              role="alert"
              className="mb-6 p-3 rounded bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-mono"
            >
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-mono font-medium text-slate-300 mb-1"
              >
                Correo Corporativo
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="refinador@lumon.com"
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 placeholder-slate-500 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-mono font-medium text-slate-300 mb-1"
              >
                Clave de Seguridad
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 placeholder-slate-500 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-slate-950 font-mono font-bold text-sm tracking-wide uppercase transition-colors shadow-lg shadow-emerald-950/40"
            >
              {isSubmitting ? 'Iniciando terminal…' : 'Acceder al Piso'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-800 text-center">
            <span className="text-xs text-slate-400 font-mono">
              ¿Nueva cuadrilla?{' '}
              <Link
                to="/register"
                className="text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-4"
              >
                Registrar Cuadrilla
              </Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
