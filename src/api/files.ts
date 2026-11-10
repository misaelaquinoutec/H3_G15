import { apiFetch } from './client'
import type {
  FilePage,
  FileSummary,
  FileRules,
  TileData,
  RefinementPayload,
  RefinementResponse,
} from './types'

export interface GetFilesParams {
  page?: number
  size?: number
  status?: string
  search?: string
  sort?: string
}

export async function getFiles(params: GetFilesParams = {}): Promise<FilePage> {
  const searchParams = new URLSearchParams()
  if (params.page !== undefined) searchParams.set('page', params.page.toString())
  if (params.size !== undefined) searchParams.set('size', params.size.toString())
  if (params.status) searchParams.set('status', params.status)
  if (params.search) searchParams.set('search', params.search)
  if (params.sort) searchParams.set('sort', params.sort)

  const query = searchParams.toString()
  return apiFetch<FilePage>(`/files${query ? `?${query}` : ''}`)
}

export async function getFile(id: number): Promise<FileSummary> {
  return apiFetch<FileSummary>(`/files/${id}`)
}

export async function getFileRules(id: number): Promise<FileRules> {
  return apiFetch<FileRules>(`/files/${id}/rules`)
}

export async function getTile(
  id: number,
  tileRow: number,
  tileCol: number,
  signal?: AbortSignal
): Promise<TileData> {
  return apiFetch<TileData>(`/files/${id}/tiles/${tileRow}/${tileCol}`, {
    signal,
  })
}

export async function postRefinement(
  id: number,
  payload: RefinementPayload,
  idempotencyKey: string
): Promise<RefinementResponse> {
  return apiFetch<RefinementResponse>(`/files/${id}/refinements`, {
    method: 'POST',
    headers: {
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(payload),
  })
}

export async function setChaosMode(level: 0 | 1 | 2): Promise<{ chaosLevel: number }> {
  return apiFetch<{ chaosLevel: number }>('/workspace/chaos', {
    method: 'PUT',
    body: JSON.stringify({ level }),
  })
}
