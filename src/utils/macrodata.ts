import type { FileRules, TileData } from '../api/types'

/**
 * Decodes base64 string to a Uint8Array of bytes (0-100 tremor per cell)
 */
export function decodeBase64Tremor(base64: string): Uint8Array {
  try {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes
  } catch {
    return new Uint8Array(0)
  }
}

export interface CellCoord {
  r: number
  c: number
}

export interface ScaryCellInfo {
  r: number
  c: number
  value: number
  tremor: number
  bin: string // '.' or 'W', 'F', 'D', 'M'
}

/**
 * Helper to get a cell's data from loaded tiles
 */
export function getCellFromTiles(
  tiles: Map<string, TileData>,
  r: number,
  c: number,
  tileSize: number
): ScaryCellInfo | null {
  const tileRow = Math.floor(r / tileSize)
  const tileCol = Math.floor(c / tileSize)
  const tileKey = `${tileRow},${tileCol}`
  const tile = tiles.get(tileKey)
  if (!tile) return null

  const localR = r - tile.originRow
  const localC = c - tile.originCol
  if (localR < 0 || localR >= tile.rows || localC < 0 || localC >= tile.cols) {
    return null
  }

  const index = localR * tile.cols + localC
  const valChar = tile.values.charAt(index) || '0'
  const binChar = tile.bins.charAt(index) || '.'
  const tremorBytes = decodeBase64Tremor(tile.tremor)
  const tremorVal = tremorBytes[index] ?? 0

  return {
    r,
    c,
    value: parseInt(valChar, 10),
    tremor: tremorVal,
    bin: binChar,
  }
}

/**
 * Connected Component BFS algorithm
 * Finds all connected cells with tremor >= rules.tremorThreshold and bin === '.'
 */
export function findConnectedScaryGroup(
  startR: number,
  startC: number,
  tiles: Map<string, TileData>,
  rules: FileRules,
  totalRows: number,
  totalCols: number,
  tileSize: number
): { cells: ScaryCellInfo[]; needsMoreTiles: { tileRow: number; tileCol: number }[] } {
  const startCell = getCellFromTiles(tiles, startR, startC, tileSize)
  if (!startCell || startCell.tremor < rules.tremorThreshold || startCell.bin !== '.') {
    return { cells: [], needsMoreTiles: [] }
  }

  const visited = new Set<string>()
  const result: ScaryCellInfo[] = []
  const queue: CellCoord[] = [{ r: startR, c: startC }]
  visited.add(`${startR},${startC}`)

  const missingTilesSet = new Set<string>()

  // Directions based on connectivity (4 or 8)
  const deltas =
    rules.connectivity === 8
      ? [
          [-1, -1], [-1, 0], [-1, 1],
          [0, -1],           [0, 1],
          [1, -1],  [1, 0],  [1, 1],
        ]
      : [
          [-1, 0],
          [0, -1], [0, 1],
          [1, 0],
        ]

  while (queue.length > 0) {
    const curr = queue.shift()!
    const cell = getCellFromTiles(tiles, curr.r, curr.c, tileSize)

    if (!cell) {
      // Tile is not loaded
      const tileRow = Math.floor(curr.r / tileSize)
      const tileCol = Math.floor(curr.c / tileSize)
      missingTilesSet.add(`${tileRow},${tileCol}`)
      continue
    }

    if (cell.tremor >= rules.tremorThreshold && cell.bin === '.') {
      result.push(cell)

      for (const [dr, dc] of deltas) {
        const nr = curr.r + dr
        const nc = curr.c + dc

        if (nr >= 0 && nr < totalRows && nc >= 0 && nc < totalCols) {
          const key = `${nr},${nc}`
          if (!visited.has(key)) {
            visited.add(key)
            queue.push({ r: nr, c: nc })
          }
        }
      }
    }
  }

  const needsMoreTiles: { tileRow: number; tileCol: number }[] = []
  missingTilesSet.forEach((key) => {
    const [tr, tc] = key.split(',').map((n) => parseInt(n, 10))
    needsMoreTiles.push({ tileRow: tr, tileCol: tc })
  })

  return { cells: result, needsMoreTiles }
}

/**
 * Calculates bin destination according to binning strategy
 */
export function calculateTargetBin(
  cells: ScaryCellInfo[],
  rules: FileRules
): { bin: 'WO' | 'FC' | 'DR' | 'MA'; isNoise: boolean; reason?: string } {
  const size = cells.length
  if (size < rules.minGroupSize) {
    return {
      bin: rules.binning.order[0],
      isNoise: true,
      reason: `Grupo muy pequeño (${size} celdas, mínimo ${rules.minGroupSize}) - Ruido.`,
    }
  }
  if (size > rules.maxGroupSize) {
    return {
      bin: rules.binning.order[0],
      isNoise: true,
      reason: `Grupo muy grande (${size} celdas, máximo ${rules.maxGroupSize}) - Ruido.`,
    }
  }

  let index = 0
  if (rules.binning.strategy === 'DIGIT_SUM_MOD') {
    const sum = cells.reduce((acc, c) => acc + c.value, 0)
    index = sum % 4
  } else if (rules.binning.strategy === 'MAX_DIGIT_MOD') {
    const max = cells.reduce((acc, c) => Math.max(acc, c.value), 0)
    index = max % 4
  }

  return {
    bin: rules.binning.order[index] || 'WO',
    isNoise: false,
  }
}
