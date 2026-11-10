/* Praise Kier */
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { getFile, getFileRules, getTile, postRefinement } from '../api/files'
import {
  findConnectedScaryGroup,
  calculateTargetBin,
  getCellFromTiles,
  type ScaryCellInfo,
} from '../utils/macrodata'
import { LumonApiError, type FileSummary, type FileRules, type TileData } from '../api/types'

const CELL_SIZE = 32 // pixels per cell

export const Refine: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const fileId = parseInt(id || '0', 10)

  const [searchParams] = useSearchParams()
  const initialRow = parseInt(searchParams.get('r') || '0', 10)
  const initialCol = parseInt(searchParams.get('c') || '0', 10)

  // File metadata & refinement rules
  const [file, setFile] = useState<FileSummary | null>(null)
  const [rules, setRules] = useState<FileRules | null>(null)
  const [isLoadingMeta, setIsLoadingMeta] = useState(true)
  const [metaError, setMetaError] = useState<string | null>(null)

  // Tiles cache: key `${tileRow},${tileCol}` -> TileData
  const [tiles, setTiles] = useState<Map<string, TileData>>(new Map())
  const inFlightTiles = useRef<Set<string>>(new Set())
  const tileAbortControllers = useRef<Map<string, AbortController>>(new Map())
  const rateLimitUntil = useRef<number>(0)

  // Scroll container and virtualization window
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)
  const [viewportWidth, setViewportWidth] = useState(800)
  const [viewportHeight, setViewportHeight] = useState(600)

  // Keyboard navigation & selected cell
  const [focusedCell, setFocusedCell] = useState<{ r: number; c: number }>({
    r: isNaN(initialRow) ? 0 : initialRow,
    c: isNaN(initialCol) ? 0 : initialCol,
  })

  // Selected scary group
  const [selectedGroup, setSelectedGroup] = useState<ScaryCellInfo[]>([])
  const [isRefining, setIsRefining] = useState(false)
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(
    null
  )

  // Drag and Drop state
  const [isDragging, setIsDragging] = useState(false)
  const [dragPos, setDragPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  // 1. Load File metadata and Rules
  useEffect(() => {
    if (!fileId) return
    setIsLoadingMeta(true)
    setMetaError(null)

    Promise.all([getFile(fileId), getFileRules(fileId)])
      .then(([fileData, rulesData]) => {
        setFile(fileData)
        setRules(rulesData)
        setIsLoadingMeta(false)
      })
      .catch((err) => {
        setMetaError(err.message || 'Error al cargar archivo.')
        setIsLoadingMeta(false)
      })
  }, [fileId])

  // 2. Measure viewport on mount/resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setViewportWidth(containerRef.current.clientWidth)
        setViewportHeight(containerRef.current.clientHeight)
      }
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  // 3. Initial scroll to coordinates from URL
  useEffect(() => {
    if (containerRef.current && (!isNaN(initialRow) || !isNaN(initialCol))) {
      containerRef.current.scrollTop = Math.max(0, initialRow * CELL_SIZE - 100)
      containerRef.current.scrollLeft = Math.max(0, initialCol * CELL_SIZE - 100)
    }
  }, [initialRow, initialCol, file])

  // 4. Calculate visible row/col ranges (Virtualized strictly <= 2500 cells)
  const BUFFER = 2
  const visibleStartRow = Math.max(0, Math.floor(scrollTop / CELL_SIZE) - BUFFER)
  const visibleEndRow = file
    ? Math.min(file.rows - 1, Math.ceil((scrollTop + viewportHeight) / CELL_SIZE) + BUFFER)
    : 0
  const visibleStartCol = Math.max(0, Math.floor(scrollLeft / CELL_SIZE) - BUFFER)
  const visibleEndCol = file
    ? Math.min(file.cols - 1, Math.ceil((scrollLeft + viewportWidth) / CELL_SIZE) + BUFFER)
    : 0

  // 5. Throttled scroll listener that updates URL with replaceState
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return
    const top = containerRef.current.scrollTop
    const left = containerRef.current.scrollLeft
    setScrollTop(top)
    setScrollLeft(left)

    // Update URL without polluting browser history
    const centerR = Math.floor((top + viewportHeight / 2) / CELL_SIZE)
    const centerC = Math.floor((left + viewportWidth / 2) / CELL_SIZE)
    const newUrl = new URL(window.location.href)
    newUrl.searchParams.set('r', centerR.toString())
    newUrl.searchParams.set('c', centerC.toString())
    window.history.replaceState(null, '', newUrl.toString())
  }, [viewportHeight, viewportWidth])

  // 6. Fetch tiles required for current visible window
  const requestTile = useCallback(
    async (tr: number, tc: number) => {
      const key = `${tr},${tc}`
      if (tiles.has(key) || inFlightTiles.current.has(key)) return
      if (Date.now() < rateLimitUntil.current) return // Respect 429 Retry-After

      inFlightTiles.current.add(key)
      const controller = new AbortController()
      tileAbortControllers.current.set(key, controller)

      try {
        const tileData = await getTile(fileId, tr, tc, controller.signal)
        setTiles((prev) => new Map(prev).set(key, tileData))
      } catch (err: any) {
        if (err instanceof LumonApiError && err.statusCode === 429 && err.retryAfter) {
          rateLimitUntil.current = Date.now() + err.retryAfter * 1000
        }
      } finally {
        inFlightTiles.current.delete(key)
        tileAbortControllers.current.delete(key)
      }
    },
    [fileId, tiles]
  )

  useEffect(() => {
    if (!file) return

    const tileSize = file.tileSize
    const startTileRow = Math.floor(visibleStartRow / tileSize)
    const endTileRow = Math.floor(visibleEndRow / tileSize)
    const startTileCol = Math.floor(visibleStartCol / tileSize)
    const endTileCol = Math.floor(visibleEndCol / tileSize)

    const visibleTileKeys = new Set<string>()

    for (let tr = startTileRow; tr <= endTileRow; tr++) {
      for (let tc = startTileCol; tc <= endTileCol; tc++) {
        visibleTileKeys.add(`${tr},${tc}`)
        requestTile(tr, tc)
      }
    }

    // Cancel in-flight requests for tiles no longer in view
    tileAbortControllers.current.forEach((controller, key) => {
      if (!visibleTileKeys.has(key)) {
        controller.abort()
        inFlightTiles.current.delete(key)
        tileAbortControllers.current.delete(key)
      }
    })
  }, [file, visibleStartRow, visibleEndRow, visibleStartCol, visibleEndCol, requestTile])

  // 7. Handle selecting / clicking a cell
  const handleCellClick = useCallback(
    (r: number, c: number) => {
      if (!file || !rules) return
      setFocusedCell({ r, c })

      const cell = getCellFromTiles(tiles, r, c, file.tileSize)
      if (!cell || cell.tremor < rules.tremorThreshold || cell.bin !== '.') {
        setSelectedGroup([])
        return
      }

      // Find full connected component
      const { cells, needsMoreTiles } = findConnectedScaryGroup(
        r,
        c,
        tiles,
        rules,
        file.rows,
        file.cols,
        file.tileSize
      )

      setSelectedGroup(cells)

      // If group hits tile boundaries, fetch missing tiles
      if (needsMoreTiles.length > 0) {
        needsMoreTiles.forEach(({ tileRow, tileCol }) => {
          requestTile(tileRow, tileCol)
        })
      }
    },
    [file, rules, tiles, requestTile]
  )

  // Selected group target bin calculation
  const targetBinInfo = useMemo(() => {
    if (!rules || selectedGroup.length === 0) return null
    return calculateTargetBin(selectedGroup, rules)
  }, [rules, selectedGroup])

  // Set of selected cell coordinate keys for O(1) highlight lookup
  const selectedCellKeys = useMemo(() => {
    const set = new Set<string>()
    selectedGroup.forEach((c) => set.add(`${c.r},${c.c}`))
    return set
  }, [selectedGroup])

  // 8. Refine selected group into a bin
  const handleRefine = useCallback(
    async (binChoice?: 'WO' | 'FC' | 'DR' | 'MA') => {
      if (!file || !rules || selectedGroup.length === 0 || isRefining) return
      if (targetBinInfo?.isNoise) {
        setFeedbackMsg({
          text: targetBinInfo.reason || 'Este grupo es considerado ruido y no puede ser refinado.',
          type: 'error',
        })
        return
      }

      const binToUse = binChoice || targetBinInfo?.bin
      if (!binToUse) return

      setIsRefining(true)
      setFeedbackMsg(null)

      const idempotencyKey = crypto.randomUUID()
      const cellsPayload = selectedGroup.map((c) => ({ r: c.r, c: c.c }))

      try {
        const response = await postRefinement(
          file.id,
          { bin: binToUse, cells: cellsPayload },
          idempotencyKey
        )

        // Optimistically update local tiles
        const binLetter = binToUse.charAt(0)
        setTiles((prev) => {
          const next = new Map(prev)
          selectedGroup.forEach((c) => {
            const tr = Math.floor(c.r / file.tileSize)
            const tc = Math.floor(c.c / file.tileSize)
            const key = `${tr},${tc}`
            const tile = next.get(key)
            if (tile) {
              const localR = c.r - tile.originRow
              const localC = c.c - tile.originCol
              const idx = localR * tile.cols + localC
              const binsArr = tile.bins.split('')
              binsArr[idx] = binLetter
              next.set(key, { ...tile, bins: binsArr.join('') })
            }
          })
          return next
        })

        // Update file progress
        setFile((prev) => (prev ? { ...prev, progress: response.progress } : null))
        setSelectedGroup([])
        setFeedbackMsg({
          text: `Grupo refinado exitosamente hacia ${binToUse}.`,
          type: 'success',
        })
      } catch (err: any) {
        if (err instanceof LumonApiError) {
          if (err.statusCode === 409) {
            // Already refined: invalidate affected tiles
            setFeedbackMsg({
              text: 'Conflicto: una o más celdas ya fueron refinadas. Actualizando datos…',
              type: 'error',
            })
            selectedGroup.forEach((c) => {
              const tr = Math.floor(c.r / file.tileSize)
              const tc = Math.floor(c.c / file.tileSize)
              setTiles((prev) => {
                const copy = new Map(prev)
                copy.delete(`${tr},${tc}`)
                return copy
              })
              requestTile(tr, tc)
            })
          } else {
            setFeedbackMsg({
              text: err.message || 'Error al refinar grupo.',
              type: 'error',
            })
          }
        } else {
          setFeedbackMsg({ text: 'Error de red al refinar.', type: 'error' })
        }
      } finally {
        setIsRefining(false)
      }
    },
    [file, rules, selectedGroup, isRefining, targetBinInfo, requestTile]
  )

  // 9. Keyboard navigation & shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!file) return

      let dr = 0
      let dc = 0

      switch (e.key) {
        case 'ArrowUp':
          dr = -1
          break
        case 'ArrowDown':
          dr = 1
          break
        case 'ArrowLeft':
          dc = -1
          break
        case 'ArrowRight':
          dc = 1
          break
        case 'PageUp':
          dr = -10
          break
        case 'PageDown':
          dr = 10
          break
        case 'Home':
          dc = -focusedCell.c
          break
        case 'End':
          dc = file.cols - 1 - focusedCell.c
          break
        case 'Enter':
        case ' ':
          e.preventDefault()
          handleCellClick(focusedCell.r, focusedCell.c)
          return
        case '1':
        case 'w':
        case 'W':
          if (selectedGroup.length > 0) handleRefine('WO')
          return
        case '2':
        case 'f':
        case 'F':
          if (selectedGroup.length > 0) handleRefine('FC')
          return
        case '3':
        case 'd':
        case 'D':
          if (selectedGroup.length > 0) handleRefine('DR')
          return
        case '4':
        case 'm':
        case 'M':
          if (selectedGroup.length > 0) handleRefine('MA')
          return
        default:
          return
      }

      if (dr !== 0 || dc !== 0) {
        e.preventDefault()
        setFocusedCell((prev) => {
          const nextR = Math.max(0, Math.min(file.rows - 1, prev.r + dr))
          const nextC = Math.max(0, Math.min(file.cols - 1, prev.c + dc))

          // Scroll into view if needed
          if (containerRef.current) {
            const cellTop = nextR * CELL_SIZE
            const cellLeft = nextC * CELL_SIZE
            if (cellTop < containerRef.current.scrollTop) {
              containerRef.current.scrollTop = cellTop
            } else if (cellTop + CELL_SIZE > containerRef.current.scrollTop + viewportHeight) {
              containerRef.current.scrollTop = cellTop + CELL_SIZE - viewportHeight
            }
            if (cellLeft < containerRef.current.scrollLeft) {
              containerRef.current.scrollLeft = cellLeft
            } else if (cellLeft + CELL_SIZE > containerRef.current.scrollLeft + viewportWidth) {
              containerRef.current.scrollLeft = cellLeft + CELL_SIZE - viewportWidth
            }
          }

          return { r: nextR, c: nextC }
        })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [file, focusedCell, handleCellClick, handleRefine, selectedGroup.length, viewportHeight, viewportWidth])

  // 10. Pointer Drag and Drop handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    if (selectedGroup.length === 0) return
    setIsDragging(true)
    setDragPos({ x: e.clientX, y: e.clientY })
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return
    setDragPos({ x: e.clientX, y: e.clientY })
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return
    setIsDragging(false)
    ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)

    // Check which bin element was dropped on
    const elem = document.elementFromPoint(e.clientX, e.clientY)
    const binElem = elem?.closest('[data-bin]')
    if (binElem) {
      const binValue = binElem.getAttribute('data-bin') as 'WO' | 'FC' | 'DR' | 'MA'
      handleRefine(binValue)
    }
  }

  if (isLoadingMeta) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12">
        <div className="w-10 h-10 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-mono text-slate-400">
          Cargando partición y reglas de refinamiento…
        </p>
      </div>
    )
  }

  if (metaError || !file || !rules) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
        <p className="text-sm font-mono text-red-400 mb-4">{metaError || 'Archivo no encontrado'}</p>
        <Link
          to="/files"
          className="px-4 py-2 bg-slate-800 text-slate-200 rounded font-mono text-xs hover:bg-slate-700"
        >
          ← Volver al listado
        </Link>
      </div>
    )
  }

  // Render visible cells in the virtual window
  const visibleCells: React.ReactNode[] = []
  for (let r = visibleStartRow; r <= visibleEndRow; r++) {
    for (let c = visibleStartCol; c <= visibleEndCol; c++) {
      const cell = getCellFromTiles(tiles, r, c, file.tileSize)
      const isSelected = selectedCellKeys.has(`${r},${c}`)
      const isFocused = focusedCell.r === r && focusedCell.c === c
      const isScary = cell ? cell.tremor >= rules.tremorThreshold && cell.bin === '.' : false

      let tremorClass = ''
      if (isScary && cell) {
        if (cell.tremor >= 85) tremorClass = 'tremor-high text-cyan-300 font-bold'
        else if (cell.tremor >= 70) tremorClass = 'tremor-med text-cyan-400 font-bold'
        else tremorClass = 'tremor-low text-cyan-500 font-medium'
      }

      visibleCells.push(
        <div
          key={`${r},${c}`}
          role="gridcell"
          aria-rowindex={r + 1}
          aria-colindex={c + 1}
          onClick={() => handleCellClick(r, c)}
          style={{
            position: 'absolute',
            top: r * CELL_SIZE,
            left: c * CELL_SIZE,
            width: CELL_SIZE,
            height: CELL_SIZE,
          }}
          className={`flex items-center justify-center select-none font-mono text-xs transition-colors cursor-pointer border ${
            isSelected
              ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200 z-10 shadow-sm shadow-cyan-500/50'
              : isFocused
              ? 'border-emerald-400 bg-slate-800/80 z-10'
              : 'border-slate-800/40 hover:bg-slate-800/50 text-slate-400'
          }`}
        >
          {cell ? (
            cell.bin !== '.' ? (
              <span
                className={`text-[10px] font-bold ${
                  cell.bin === 'W'
                    ? 'text-blue-400'
                    : cell.bin === 'F'
                    ? 'text-emerald-400'
                    : cell.bin === 'D'
                    ? 'text-amber-400'
                    : 'text-red-400'
                }`}
              >
                {cell.bin}
              </span>
            ) : (
              <span className={tremorClass}>{cell.value}</span>
            )
          ) : (
            <span className="w-1.5 h-1.5 rounded-full bg-slate-800 animate-pulse" />
          )}
        </div>
      )
    }
  }

  const isCompleted = file.progress.percentage >= 100

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-slate-950 font-mono">
      {/* Top Header: File status & Progress */}
      <div className="border-b border-slate-800 bg-slate-900/90 px-4 py-2.5 flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center space-x-4">
          <Link to="/files" className="text-slate-400 hover:text-slate-200 text-xs">
            ← Salir
          </Link>
          <span className="font-bold text-sm text-slate-100">{file.name}</span>
          <span className="text-xs text-slate-400">
            {file.rows} × {file.cols}
          </span>
        </div>

        {/* Progress Bars for all 4 bins */}
        <div className="flex items-center space-x-6 text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-slate-400">Total:</span>
            <span className="text-emerald-400 font-bold">{file.progress.percentage.toFixed(1)}%</span>
          </div>

          <div className="flex space-x-3 text-[11px]">
            <span className="text-blue-400">WO: {file.progress.bins.WO}</span>
            <span className="text-emerald-400">FC: {file.progress.bins.FC}</span>
            <span className="text-amber-400">DR: {file.progress.bins.DR}</span>
            <span className="text-red-400">MA: {file.progress.bins.MA}</span>
          </div>
        </div>
      </div>

      {/* Main Grid Viewport */}
      <div className="flex-1 relative overflow-hidden flex flex-col">
        {/* Scrollable virtual canvas */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          tabIndex={0}
          role="grid"
          aria-label="Grilla de refinamiento macrodata"
          className="flex-1 overflow-auto outline-none relative bg-slate-950"
        >
          <div
            style={{
              width: file.cols * CELL_SIZE,
              height: file.rows * CELL_SIZE,
              position: 'relative',
            }}
          >
            {visibleCells}
          </div>
        </div>

        {/* Floating feedback message */}
        {feedbackMsg && (
          <div
            role="status"
            className={`absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-xs font-mono shadow-xl border z-30 transition-all ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300'
                : 'bg-red-950/90 border-red-500/50 text-red-300'
            }`}
          >
            {feedbackMsg.text}
          </div>
        )}
      </div>

      {/* Selected Group Inspector and 4 Refinement Boxes */}
      <div className="border-t border-slate-800 bg-slate-900/95 p-4 shrink-0 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Selection Details */}
        <div className="flex items-center space-x-4 text-xs">
          {selectedGroup.length > 0 ? (
            <div
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className="flex items-center space-x-3 bg-cyan-950/50 border border-cyan-500/40 px-3 py-2 rounded-lg cursor-grab active:cursor-grabbing"
              title="Arrastra este grupo a una de las cajas"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
              <div>
                <span className="text-cyan-300 font-bold">
                  {selectedGroup.length} números seleccionados
                </span>
                <span className="text-slate-400 text-[10px] ml-2">
                  (Suma: {selectedGroup.reduce((a, b) => a + b.value, 0)})
                </span>
              </div>
              {targetBinInfo && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                    targetBinInfo.isNoise
                      ? 'bg-red-950/80 text-red-400 border border-red-500/30'
                      : 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {targetBinInfo.isNoise ? 'RUIDO' : `Destino: ${targetBinInfo.bin}`}
                </span>
              )}
            </div>
          ) : (
            <div className="text-slate-500 text-xs italic">
              Haz clic o presiona Enter sobre un número tembloroso para seleccionar su grupo.
            </div>
          )}
        </div>

        {/* 4 Refinement Bins */}
        <div className="flex items-center space-x-3 w-full md:w-auto">
          {(['WO', 'FC', 'DR', 'MA'] as const).map((binName) => {
            const isTarget = targetBinInfo?.bin === binName && !targetBinInfo.isNoise
            return (
              <button
                key={binName}
                data-bin={binName}
                onClick={() => handleRefine(binName)}
                disabled={selectedGroup.length === 0 || isRefining || targetBinInfo?.isNoise}
                className={`flex-1 md:flex-none px-4 py-2.5 rounded-lg border font-mono font-bold text-xs transition-all uppercase flex items-center justify-center space-x-2 ${
                  isTarget
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-950/50 scale-105'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700 disabled:opacity-30'
                }`}
              >
                <span>{binName}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Floating Drag Indicator */}
      {isDragging && (
        <div
          style={{
            position: 'fixed',
            left: dragPos.x - 20,
            top: dragPos.y - 20,
            pointerEvents: 'none',
            zIndex: 9999,
          }}
          className="w-10 h-10 rounded-full bg-cyan-500/90 text-slate-950 font-bold flex items-center justify-center shadow-2xl animate-pulse"
        >
          {selectedGroup.length}
        </div>
      )}

      {/* 100% Completed Modal */}
      {isCompleted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4">
          <div className="max-w-md w-full bg-slate-900 border border-emerald-500/50 rounded-2xl p-8 text-center shadow-2xl">
            <div className="inline-flex p-3 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-emerald-400 mb-4 animate-bounce">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold font-mono text-emerald-400 uppercase tracking-widest mb-2">
              Partición Completada al 100%
            </h2>
            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              El archivo ha sido completamente refinado. Kier Eagan se enorgullece de tu labor en Macrodata
              Refinement.
            </p>
            <Link
              to="/files"
              className="inline-block py-2.5 px-6 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-mono font-bold rounded-lg text-xs tracking-wider uppercase transition-colors"
            >
              Volver a Particiones
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
