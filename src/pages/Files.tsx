/* Praise Kier */
import React, { useEffect, useState, useRef, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getFiles } from '../api/files'
import type { FileSummary, FilePage } from '../api/types'

export const Files: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()

  // Read URL query parameters with robust fallbacks
  const pageParam = parseInt(searchParams.get('page') || '0', 10)
  const currentPage = isNaN(pageParam) || pageParam < 0 ? 0 : pageParam

  const sizeParam = parseInt(searchParams.get('size') || '10', 10)
  const pageSize = [10, 25, 50].includes(sizeParam) ? sizeParam : 10

  const statusFilter = searchParams.get('status') || ''
  const searchFilter = searchParams.get('search') || ''
  const sortParam = searchParams.get('sort') || ''

  const [searchInput, setSearchInput] = useState(searchFilter)
  const [data, setData] = useState<FilePage | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Track latest request ID to prevent stale responses from overwriting newer ones (Regla del Tablero)
  const activeRequestIdRef = useRef<number>(0)
  const abortControllerRef = useRef<AbortController | null>(null)

  const updateUrlParams = useCallback(
    (updates: Record<string, string | null>) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        Object.entries(updates).forEach(([key, val]) => {
          if (val === null || val === '') {
            next.delete(key)
          } else {
            next.set(key, val)
          }
        })
        return next
      })
    },
    [setSearchParams]
  )

  // Debounced search input handler
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== searchFilter) {
        updateUrlParams({ search: searchInput || null, page: '0' })
      }
    }, 350)
    return () => clearTimeout(timer)
  }, [searchInput, searchFilter, updateUrlParams])

  // Sync search input if URL changes externally (back/forward)
  useEffect(() => {
    setSearchInput(searchFilter)
  }, [searchFilter])

  // Fetch files whenever URL params change
  useEffect(() => {
    const requestId = ++activeRequestIdRef.current
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    setIsLoading(true)
    setError(null)

    getFiles({
      page: currentPage,
      size: pageSize,
      status: statusFilter || undefined,
      search: searchFilter || undefined,
      sort: sortParam || undefined,
    })
      .then((res) => {
        // Regla del Tablero: only apply if this is still the active request
        if (requestId === activeRequestIdRef.current) {
          setData(res)
          setIsLoading(false)
        }
      })
      .catch((err) => {
        if (requestId === activeRequestIdRef.current && err.name !== 'AbortError') {
          setError(err.message || 'Error al cargar archivos de Macrodata Refinement.')
          setIsLoading(false)
        }
      })

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [currentPage, pageSize, statusFilter, searchFilter, sortParam])

  return (
    <div className="flex-1 p-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold font-mono tracking-wider text-emerald-400 uppercase">
            Archivos de Datos (MDR)
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Particiones de datos asignadas a la cuadrilla para su clasificación y refinamiento.
          </p>
        </div>

        {data && (
          <div className="text-xs font-mono text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg self-start">
            Total archivos: <span className="text-emerald-400 font-bold">{data.totalElements}</span>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 mb-6 flex flex-col md:flex-row items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por nombre de archivo…"
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
          <svg
            className="w-4 h-4 text-slate-500 absolute left-3 top-2.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Status Filter */}
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <label htmlFor="status-select" className="text-xs font-mono text-slate-400 shrink-0">
            Estado:
          </label>
          <select
            id="status-select"
            value={statusFilter}
            onChange={(e) => updateUrlParams({ status: e.target.value || null, page: '0' })}
            className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
          >
            <option value="">Todos los Estados</option>
            <option value="PENDING">PENDING (Sin Iniciar)</option>
            <option value="IN_PROGRESS">IN_PROGRESS (En Progreso)</option>
            <option value="COMPLETED">COMPLETED (Completado)</option>
          </select>
        </div>

        {/* Page Size */}
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <label htmlFor="size-select" className="text-xs font-mono text-slate-400 shrink-0">
            Tamaño:
          </label>
          <select
            id="size-select"
            value={pageSize}
            onChange={(e) => updateUrlParams({ size: e.target.value, page: '0' })}
            className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
          >
            <option value="10">10 por página</option>
            <option value="25">25 por página</option>
            <option value="50">50 por página</option>
          </select>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div
          role="alert"
          className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs font-mono mb-6"
        >
          {error}
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="py-24 text-center">
          <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xs font-mono text-slate-400">Consultando particiones de datos…</p>
        </div>
      ) : data?.content.length === 0 ? (
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-12 text-center">
          <p className="text-sm font-mono text-slate-400">
            No se encontraron archivos con los criterios especificados.
          </p>
        </div>
      ) : (
        /* Files Grid / List */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {data?.content.map((file: FileSummary) => (
            <div
              key={file.id}
              className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-xl p-5 flex flex-col justify-between transition-colors shadow-lg"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h2 className="text-sm font-bold font-mono text-slate-100 truncate">
                    {file.name}
                  </h2>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase shrink-0 ${
                      file.status === 'COMPLETED'
                        ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40'
                        : file.status === 'IN_PROGRESS'
                        ? 'bg-blue-950/60 text-blue-400 border-blue-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {file.status}
                  </span>
                </div>

                <div className="text-xs font-mono text-slate-400 mb-4 space-y-1">
                  <div>
                    Dimensiones: <span className="text-slate-300">{file.rows} × {file.cols}</span>
                    <span className="text-slate-500 ml-2">({file.tileSize}x{file.tileSize} bloque)</span>
                  </div>
                  <div>
                    Errores registrados: <span className="text-amber-400">{file.mistakes}</span>
                  </div>
                </div>

                {/* Overall Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-slate-400">Progreso total:</span>
                    <span className="font-bold text-emerald-400">
                      {(file.progress?.overall ?? (file.progress as any)?.percentage ?? 0).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="bg-emerald-500 h-full transition-all duration-300"
                      style={{
                        width: `${Math.min(
                          100,
                          file.progress?.overall ?? (file.progress as any)?.percentage ?? 0
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                {/* 4 Bins Breakdown */}
                <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-mono mb-4 bg-slate-950 p-2 rounded-lg border border-slate-800/80">
                  <div className="flex flex-col">
                    <span className="text-blue-400 font-bold">WO</span>
                    <span className="text-slate-300">
                      {file.progress?.WO ?? (file.progress as any)?.bins?.WO ?? 0}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-emerald-400 font-bold">FC</span>
                    <span className="text-slate-300">
                      {file.progress?.FC ?? (file.progress as any)?.bins?.FC ?? 0}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-amber-400 font-bold">DR</span>
                    <span className="text-slate-300">
                      {file.progress?.DR ?? (file.progress as any)?.bins?.DR ?? 0}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-red-400 font-bold">MA</span>
                    <span className="text-slate-300">
                      {file.progress?.MA ?? (file.progress as any)?.bins?.MA ?? 0}
                    </span>
                  </div>
                </div>
              </div>

              <Link
                to={`/files/${file.id}/refine`}
                className="w-full py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 hover:text-emerald-200 border border-emerald-500/40 rounded-lg text-xs font-mono font-semibold tracking-wider uppercase text-center transition-colors"
              >
                Abrir Grilla de Refinamiento →
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-800 pt-4 text-xs font-mono">
          <span className="text-slate-400">
            Página <span className="text-slate-200 font-bold">{data.page + 1}</span> de{' '}
            <span className="text-slate-200 font-bold">{data.totalPages}</span>
          </span>

          <div className="flex space-x-2">
            <button
              onClick={() => updateUrlParams({ page: (currentPage - 1).toString() })}
              disabled={currentPage <= 0}
              className="px-3 py-1.5 bg-slate-900 border border-slate-700 hover:border-slate-600 disabled:opacity-40 rounded text-slate-300 transition-colors"
            >
              ← Anterior
            </button>
            <button
              onClick={() => updateUrlParams({ page: (currentPage + 1).toString() })}
              disabled={currentPage >= data.totalPages - 1}
              className="px-3 py-1.5 bg-slate-900 border border-slate-700 hover:border-slate-600 disabled:opacity-40 rounded text-slate-300 transition-colors"
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
