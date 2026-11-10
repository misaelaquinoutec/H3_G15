/* Praise Kier */
import React, { useEffect, useState, useCallback } from 'react'
import {
  getIntegrationsStatus,
  checkClearance,
  requestDeployChallenge,
  verifyDeploy,
} from '../api/integrations'
import { setChaosMode } from '../api/files'
import { getBuildHeader } from '../api/client'
import { checkHealth } from '../api/auth'
import type { IntegrationStatus, ClearanceCheckResult } from '../api/types'

export const Status: React.FC = () => {
  const [status, setStatus] = useState<IntegrationStatus | null>(null)
  const [apiHealth, setApiHealth] = useState<'checking' | 'ok' | 'down'>('checking')
  const [isLoading, setIsLoading] = useState(true)
  const [isCheckingClearance, setIsCheckingClearance] = useState(false)
  const [clearanceResult, setClearanceResult] = useState<ClearanceCheckResult | null>(null)
  const [clearanceError, setClearanceError] = useState<string | null>(null)

  // Chaos mode control
  const [chaosLevel, setChaosLevel] = useState<0 | 1 | 2>(0)
  const [isSettingChaos, setIsSettingChaos] = useState(false)

  // Deploy challenge control
  const [customOrigin, setCustomOrigin] = useState('')
  const [deployChallengeToken, setDeployChallengeToken] = useState<string | null>(null)
  const [deployMsg, setDeployMsg] = useState<string | null>(null)

  const buildSha = getBuildHeader()

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [integrationsData, healthData] = await Promise.allSettled([
        getIntegrationsStatus(),
        checkHealth(),
      ])

      if (integrationsData.status === 'fulfilled') {
        setStatus(integrationsData.value)
      }

      if (healthData.status === 'fulfilled' && healthData.value.status === 'ok') {
        setApiHealth('ok')
      } else {
        setApiHealth('down')
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleClearanceCheck = async () => {
    setIsCheckingClearance(true)
    setClearanceError(null)
    setClearanceResult(null)
    try {
      const res = await checkClearance()
      setClearanceResult(res)
      await loadData()
    } catch (err: any) {
      setClearanceError(err.message || 'Error al ejecutar la revisión automática.')
    } finally {
      setIsCheckingClearance(false)
    }
  }

  const handleChaosChange = async (level: 0 | 1 | 2) => {
    setIsSettingChaos(true)
    try {
      await setChaosMode(level)
      setChaosLevel(level)
    } catch (err: any) {
      alert(`Error al cambiar modo caos: ${err.message}`)
    } finally {
      setIsSettingChaos(false)
    }
  }

  const handleRequestChallenge = async () => {
    if (!customOrigin) return
    try {
      const res = await requestDeployChallenge(customOrigin)
      setDeployChallengeToken(res.token)
      setDeployMsg(`Token generado. Guarda este valor exactamente en ${res.path}`)
    } catch (err: any) {
      setDeployMsg(`Error: ${err.message}`)
    }
  }

  const handleVerifyDeploy = async () => {
    try {
      const res = await verifyDeploy()
      setDeployMsg(`¡Dominio verificado exitosamente! Origen: ${res.origin}`)
      await loadData()
    } catch (err: any) {
      setDeployMsg(`Error de verificación: ${err.message}`)
    }
  }

  return (
    <div className="flex-1 p-6 max-w-6xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold font-mono tracking-wider text-emerald-400 uppercase">
            Diagnóstico del Sistema
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Métricas de infraestructura, integraciones de producción y autorización de clearance.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={isLoading}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-mono transition-colors self-start"
        >
          {isLoading ? 'Actualizando…' : 'Refrescar Diagnóstico'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Build SHA Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
          <span className="text-xs font-mono text-slate-400 uppercase">Versión de Build</span>
          <div className="mt-2 flex items-center space-x-2">
            <span className="font-mono text-xl font-bold text-slate-100">{buildSha}</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                buildSha === 'dev'
                  ? 'bg-amber-950/60 text-amber-400 border border-amber-500/30'
                  : 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              {buildSha === 'dev' ? 'Local / Development' : 'Producción'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-mono">
            Cabecera obligatoria X-Lumon-Build inyectada en cada llamada.
          </p>
        </div>

        {/* API Health Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
          <span className="text-xs font-mono text-slate-400 uppercase">Estado de la API</span>
          <div className="mt-2 flex items-center space-x-2">
            <div
              className={`w-3 h-3 rounded-full ${
                apiHealth === 'ok'
                  ? 'bg-emerald-400 animate-pulse'
                  : apiHealth === 'down'
                  ? 'bg-red-400'
                  : 'bg-amber-400'
              }`}
            />
            <span className="font-mono text-lg font-bold text-slate-100">
              {apiHealth === 'ok' ? 'Operativo' : apiHealth === 'down' ? 'Sin Respuesta' : 'Verificando…'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-mono">
            Endpoint público GET /meta/health
          </p>
        </div>

        {/* Clearance Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
          <span className="text-xs font-mono text-slate-400 uppercase">Piso de Pruebas</span>
          <div className="mt-2 flex items-center space-x-2">
            <span
              className={`text-sm font-bold font-mono px-2.5 py-1 rounded border ${
                status?.clearance?.granted
                  ? 'bg-emerald-950/50 text-emerald-400 border-emerald-500/40'
                  : 'bg-amber-950/50 text-amber-400 border-amber-500/40'
              }`}
            >
              {status?.clearance?.granted ? '🔓 Clearance Aprobada' : '🔒 Clearance Requerida'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-mono">
            Desbloquea los endpoints de Refinadores, Tickets y Tiempo Real.
          </p>
        </div>
      </div>

      {/* Automatic Clearance Trigger Banner */}
      <div className="bg-slate-900/90 border border-emerald-500/40 rounded-xl p-6 mb-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-base font-bold font-mono text-emerald-400 uppercase">
              Revisión Automática de Clearance (CP3)
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Ejecuta la validación de uso real de tu aplicación desplegada (Despliegue con SHA real,
              sesión con refresh exitoso, grilla con más de 30 bloques sin duplicados y al menos 3
              grupos refinados con modo caos).
            </p>
          </div>

          <button
            onClick={handleClearanceCheck}
            disabled={isCheckingClearance}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-slate-950 font-mono font-bold rounded-lg text-xs uppercase tracking-wider transition-colors shadow-lg shadow-emerald-900/40 shrink-0"
          >
            {isCheckingClearance ? 'Ejecutando Revisión…' : 'Abrir el Piso de Pruebas'}
          </button>
        </div>

        {clearanceError && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-300 text-xs font-mono">
            {clearanceError}
          </div>
        )}

        {clearanceResult && (
          <div className="mt-6 border-t border-slate-800 pt-4">
            <h3 className="text-xs font-mono font-bold text-slate-200 uppercase mb-3">
              Resultado de las Comprobaciones:
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {clearanceResult.checks.map((check, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded border text-xs font-mono ${
                    check.passed
                      ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                      : 'bg-red-950/30 border-red-500/30 text-red-300'
                  }`}
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span>{check.name}</span>
                    <span>{check.passed ? '✓ PASÓ' : '✗ FALLÓ'}</span>
                  </div>
                  {check.reason && <p className="mt-1 text-[11px] text-slate-400">{check.reason}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Modo Caos Controller */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6">
          <h2 className="text-sm font-bold font-mono text-slate-200 uppercase mb-2">
            Control de Modo Caos (PUT /workspace/chaos)
          </h2>
          <p className="text-xs text-slate-400 mb-4 leading-relaxed font-mono">
            Activa latencia aleatoria, códigos 503 con Retry-After y cortes de conexión para probar la
            resiliencia de la consola.
          </p>

          <div className="flex gap-2">
            {[0, 1, 2].map((lvl) => (
              <button
                key={lvl}
                onClick={() => handleChaosChange(lvl as 0 | 1 | 2)}
                disabled={isSettingChaos}
                className={`flex-1 py-2 px-3 rounded-lg font-mono text-xs font-semibold border transition-colors ${
                  chaosLevel === lvl
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                Nivel {lvl} {lvl === 0 ? '(Normal)' : lvl === 1 ? '(Moderado)' : '(Extremo)'}
              </button>
            ))}
          </div>
        </div>

        {/* Verificación de Dominio */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6">
          <h2 className="text-sm font-bold font-mono text-slate-200 uppercase mb-2">
            Verificación de Dominio CORS
          </h2>
          <p className="text-xs text-slate-400 mb-4 font-mono">
            Origen actual:{' '}
            <span className="text-emerald-400 font-semibold">
              {status?.deploy?.origin || 'Sin verificar (solo localhost permitido)'}
            </span>
          </p>

          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="url"
                value={customOrigin}
                onChange={(e) => setCustomOrigin(e.target.value)}
                placeholder="https://su-app.vercel.app"
                className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={handleRequestChallenge}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-mono"
              >
                1. Solicitar Token
              </button>
            </div>

            {deployChallengeToken && (
              <div className="p-3 bg-slate-950 border border-slate-800 rounded text-xs font-mono">
                <span className="text-slate-400">Token a publicar:</span>
                <p className="text-emerald-400 break-all select-all font-bold mt-1">
                  {deployChallengeToken}
                </p>
              </div>
            )}

            <button
              onClick={handleVerifyDeploy}
              className="w-full py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-mono font-semibold"
            >
              2. Verificar Dominio (POST /integrations/deploy/verify)
            </button>

            {deployMsg && (
              <p className="text-xs font-mono text-slate-300 bg-slate-950 p-2 rounded border border-slate-800">
                {deployMsg}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
