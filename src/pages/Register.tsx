/* Praise Kier */
import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LumonApiError } from '../api/types'

export const Register: React.FC = () => {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [teamName, setTeamName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [generalError, setGeneralError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setGeneralError(null)
    setFieldErrors({})
    setIsSubmitting(true)

    try {
      await register({ teamName, email, password })
      navigate('/files', { replace: true })
    } catch (err: any) {
      if (err instanceof LumonApiError) {
        if (err.details?.fields) {
          setFieldErrors(err.details.fields as Record<string, string>)
        } else {
          setGeneralError(err.message || 'Error al registrar cuadrilla.')
        }
      } else {
        setGeneralError('No se pudo conectar con el servidor.')
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
          Inscripción de Cuadrilla de Macrodata Refinement
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-8 shadow-2xl backdrop-blur-md">
          {generalError && (
            <div
              role="alert"
              className="mb-6 p-3 rounded bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-mono"
            >
              {generalError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="teamName"
                className="block text-xs font-mono font-medium text-slate-300 mb-1"
              >
                Nombre de la Cuadrilla
              </label>
              <input
                id="teamName"
                type="text"
                required
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Ej. Cuadrilla Kier"
                className={`w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border ${
                  fieldErrors.teamName ? 'border-red-500' : 'border-slate-700'
                } text-slate-100 placeholder-slate-500 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-colors`}
              />
              {fieldErrors.teamName && (
                <p className="mt-1 text-xs text-red-400 font-mono">{fieldErrors.teamName}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="reg-email"
                className="block text-xs font-mono font-medium text-slate-300 mb-1"
              >
                Correo Electrónico
              </label>
              <input
                id="reg-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="supervisor@lumon.com"
                className={`w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border ${
                  fieldErrors.email ? 'border-red-500' : 'border-slate-700'
                } text-slate-100 placeholder-slate-500 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-colors`}
              />
              {fieldErrors.email && (
                <p className="mt-1 text-xs text-red-400 font-mono">{fieldErrors.email}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="reg-password"
                className="block text-xs font-mono font-medium text-slate-300 mb-1"
              >
                Contraseña
              </label>
              <input
                id="reg-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className={`w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border ${
                  fieldErrors.password ? 'border-red-500' : 'border-slate-700'
                } text-slate-100 placeholder-slate-500 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-colors`}
              />
              {fieldErrors.password && (
                <p className="mt-1 text-xs text-red-400 font-mono">{fieldErrors.password}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-slate-950 font-mono font-bold text-sm tracking-wide uppercase transition-colors shadow-lg shadow-emerald-950/40"
            >
              {isSubmitting ? 'Registrando cuadrilla…' : 'Crear y Acceder'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-800 text-center">
            <span className="text-xs text-slate-400 font-mono">
              ¿Ya tienes credenciales?{' '}
              <Link
                to="/login"
                className="text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-4"
              >
                Ingresar al Terminal
              </Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
