import {
  apiFetch,
  setAccessToken,
  setStoredRefreshToken,
  broadcastLogout,
  broadcastTokenRefreshed,
} from './client'
import type { AuthMeResponse, AuthResponse } from './types'

export interface RegisterPayload {
  teamName: string
  email: string
  password: string
}

export interface LoginPayload {
  email: string
  password: string
}

export async function registerCrew(payload: RegisterPayload): Promise<AuthResponse> {
  const data = await apiFetch<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
    skipAuth: true,
  })
  setAccessToken(data.accessToken)
  setStoredRefreshToken(data.refreshToken)
  broadcastTokenRefreshed(data.accessToken)
  return data
}

export async function loginCrew(payload: LoginPayload): Promise<AuthResponse> {
  const data = await apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
    skipAuth: true,
  })
  setAccessToken(data.accessToken)
  setStoredRefreshToken(data.refreshToken)
  broadcastTokenRefreshed(data.accessToken)
  return data
}

export async function logoutCrew(): Promise<void> {
  try {
    await apiFetch('/auth/logout', {
      method: 'POST',
    })
  } catch {
    // Even if server call fails, clear local session
  } finally {
    broadcastLogout('Sesión cerrada manualmente.')
  }
}

export async function getAuthMe(): Promise<AuthMeResponse> {
  return apiFetch<AuthMeResponse>('/auth/me')
}

export async function checkHealth(): Promise<{ status: string; service: string; time: string }> {
  return apiFetch<{ status: string; service: string; time: string }>('/meta/health', {
    skipAuth: true,
  })
}
