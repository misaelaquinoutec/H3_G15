import { apiFetch } from './client'
import type { IntegrationStatus, ClearanceCheckResult } from './types'

export async function getIntegrationsStatus(): Promise<IntegrationStatus> {
  return apiFetch<IntegrationStatus>('/integrations/status')
}

export async function requestDeployChallenge(origin: string): Promise<{
  token: string
  path: string
  expiresAt: string
}> {
  return apiFetch<{ token: string; path: string; expiresAt: string }>(
    '/integrations/deploy/challenge',
    {
      method: 'POST',
      body: JSON.stringify({ origin }),
    }
  )
}

export async function verifyDeploy(): Promise<{ origin: string; verifiedAt: string }> {
  return apiFetch<{ origin: string; verifiedAt: string }>('/integrations/deploy/verify', {
    method: 'POST',
  })
}

export interface SupabaseStorageConfig {
  provider: 'SUPABASE'
  url: string
  anonKey: string
  bucket: string
}

export interface CloudinaryStorageConfig {
  provider: 'CLOUDINARY'
  cloudName: string
  uploadPreset: string
}

export type StorageConfigPayload = SupabaseStorageConfig | CloudinaryStorageConfig

export async function configureStorage(payload: StorageConfigPayload): Promise<{
  provider: 'SUPABASE' | 'CLOUDINARY'
  verifiedAt: string | null
  checks: { name: string; passed: boolean; reason?: string }[]
}> {
  return apiFetch('/integrations/storage', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function checkClearance(): Promise<ClearanceCheckResult> {
  return apiFetch<ClearanceCheckResult>('/clearance/check', {
    method: 'POST',
  })
}
