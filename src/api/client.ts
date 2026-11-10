import { LumonApiError, type ApiErrorResponse, type AuthResponse } from './types'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'https://lumon-api.vercel.app/api/v1'

const REFRESH_TOKEN_KEY = 'lumon_refresh_token'
const BROADCAST_CHANNEL_NAME = 'lumon_session_channel'

// The access token lives ONLY in memory
let inMemoryAccessToken: string | null = null

// Broadcast channel for multi-tab communication
const sessionChannel =
  typeof BroadcastChannel !== 'undefined'
    ? new BroadcastChannel(BROADCAST_CHANNEL_NAME)
    : null

export const getAccessToken = (): string | null => inMemoryAccessToken

export const setAccessToken = (token: string | null) => {
  inMemoryAccessToken = token
}

export const getStoredRefreshToken = (): string | null => {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY)
  } catch {
    return null
  }
}

export const setStoredRefreshToken = (token: string | null) => {
  try {
    if (token) {
      localStorage.setItem(REFRESH_TOKEN_KEY, token)
    } else {
      localStorage.removeItem(REFRESH_TOKEN_KEY)
    }
  } catch {
    // Ignore storage errors
  }
}

// In-flight refresh promise to coordinate concurrent requests in the same tab
let inFlightRefreshPromise: Promise<string | null> | null = null

// Callbacks for auth state changes
type AuthCallback = (authenticated: boolean, reason?: string) => void
const authSubscribers = new Set<AuthCallback>()

export const subscribeToAuthChanges = (cb: AuthCallback) => {
  authSubscribers.add(cb)
  return () => {
    authSubscribers.delete(cb)
  }
}

export const notifyAuthChange = (authenticated: boolean, reason?: string) => {
  authSubscribers.forEach((cb) => cb(authenticated, reason))
}

// Listen to multi-tab events
if (sessionChannel) {
  sessionChannel.onmessage = (event) => {
    const { type, token, reason } = event.data || {}
    if (type === 'LOGOUT') {
      setAccessToken(null)
      setStoredRefreshToken(null)
      notifyAuthChange(false, reason || 'Sesión cerrada en otra pestaña.')
    } else if (type === 'TOKEN_REFRESHED' && token) {
      setAccessToken(token)
    }
  }
}

export const broadcastLogout = (reason?: string) => {
  setAccessToken(null)
  setStoredRefreshToken(null)
  sessionChannel?.postMessage({ type: 'LOGOUT', reason })
  notifyAuthChange(false, reason)
}

export const broadcastTokenRefreshed = (token: string) => {
  setAccessToken(token)
  sessionChannel?.postMessage({ type: 'TOKEN_REFRESHED', token })
}

/**
 * Coordinated Token Refreshing across concurrent requests and multiple tabs
 */
export async function refreshSession(): Promise<string | null> {
  const currentRefreshToken = getStoredRefreshToken()
  if (!currentRefreshToken) {
    broadcastLogout('No hay refresh token disponible.')
    return null
  }

  // If a refresh is already in-flight in this tab, wait for it
  if (inFlightRefreshPromise) {
    return inFlightRefreshPromise
  }

  inFlightRefreshPromise = (async () => {
    // Use Web Locks API if available to ensure only ONE tab performs the network call
    if (typeof navigator !== 'undefined' && 'locks' in navigator) {
      return navigator.locks.request('lumon_refresh_lock', async () => {
        // Inside the lock, check if another tab already refreshed while we waited
        const tokenAfterWait = getStoredRefreshToken()
        if (tokenAfterWait && tokenAfterWait !== currentRefreshToken && inMemoryAccessToken) {
          return inMemoryAccessToken
        }
        return executeRefreshCall(currentRefreshToken)
      })
    }
    return executeRefreshCall(currentRefreshToken)
  })().finally(() => {
    inFlightRefreshPromise = null
  })

  return inFlightRefreshPromise
}

async function executeRefreshCall(refreshTokenToUse: string): Promise<string | null> {
  try {
    const buildHeader = getBuildHeader()
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Lumon-Build': buildHeader,
      },
      body: JSON.stringify({ refreshToken: refreshTokenToUse }),
    })

    if (!response.ok) {
      const errorJson = (await response.json().catch(() => ({}))) as ApiErrorResponse
      if (errorJson.error === 'REFRESH_REUSED' || errorJson.error === 'SESSION_REVOKED') {
        broadcastLogout('Sesión revocada o refresh token reutilizado.')
      } else {
        broadcastLogout('Error al renovar la sesión.')
      }
      return null
    }

    const data = (await response.json()) as AuthResponse
    setAccessToken(data.accessToken)
    setStoredRefreshToken(data.refreshToken)
    broadcastTokenRefreshed(data.accessToken)
    return data.accessToken
  } catch {
    broadcastLogout('Error de conexión al renovar sesión.')
    return null
  }
}

export function getBuildHeader(): string {
  // In dev / localhost it is always 'dev', in production it is the short commit SHA
  if (typeof __LUMON_BUILD__ !== 'undefined') {
    return __LUMON_BUILD__
  }
  return 'dev'
}

export interface ApiFetchOptions extends RequestInit {
  retryOn503?: boolean
  skipAuth?: boolean
}

/**
 * Standard fetch wrapper with authentication, X-Lumon-Build, 401 retry and 503 backoff
 */
export async function apiFetch<T>(
  endpoint: string,
  options: ApiFetchOptions = {},
  isRetry = false
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`
  const headers = new Headers(options.headers || {})

  // Mandatory X-Lumon-Build header
  if (!headers.has('X-Lumon-Build')) {
    headers.set('X-Lumon-Build', getBuildHeader())
  }

  // Authorization header unless skipAuth is specified
  if (!options.skipAuth) {
    const token = getAccessToken()
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`)
    }
  }

  // Default Content-Type to application/json if there's a body and not already set
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  let response: Response
  try {
    response = await fetch(url, { ...options, headers })
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw err
    }
    throw new LumonApiError(
      {
        error: 'NETWORK_ERROR',
        message: 'No se pudo establecer conexión con el servidor.',
        details: null,
        timestamp: new Date().toISOString(),
        path: endpoint,
        requestId: 'local_net_err',
      },
      0
    )
  }

  // Handle 503 Service Unavailable (Modo Caos) with Retry-After and backoff
  if (response.status === 503 && options.retryOn503 !== false && !isRetry) {
    const retryAfterHeader = response.headers.get('Retry-After')
    const waitSeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 1
    const waitMs = Math.max(1, isNaN(waitSeconds) ? 1 : waitSeconds) * 1000
    await new Promise((r) => setTimeout(r, waitMs))
    return apiFetch<T>(endpoint, options, true)
  }

  // Handle 401 TOKEN_EXPIRED with single coordinated refresh
  if (response.status === 401 && !options.skipAuth && !isRetry) {
    let errorData: ApiErrorResponse | null = null
    try {
      const clone = response.clone()
      errorData = (await clone.json()) as ApiErrorResponse
    } catch {
      // Ignore
    }

    if (errorData?.error === 'TOKEN_EXPIRED') {
      const newToken = await refreshSession()
      if (newToken) {
        // Retry the exact same request once with the new token
        headers.set('Authorization', `Bearer ${newToken}`)
        return apiFetch<T>(endpoint, { ...options, headers }, true)
      }
    } else if (
      errorData?.error === 'TOKEN_INVALID' ||
      errorData?.error === 'SESSION_REVOKED' ||
      errorData?.error === 'REFRESH_REUSED'
    ) {
      broadcastLogout('Sesión inválida o revocada.')
    }
  }

  // Handle errors
  if (!response.ok) {
    const retryAfter = response.headers.get('Retry-After')
    const retrySeconds = retryAfter ? parseInt(retryAfter, 10) : undefined

    let errorData: ApiErrorResponse
    try {
      errorData = (await response.json()) as ApiErrorResponse
    } catch {
      errorData = {
        error: `HTTP_${response.status}`,
        message: response.statusText || 'Error del servidor.',
        details: null,
        timestamp: new Date().toISOString(),
        path: endpoint,
        requestId: response.headers.get('X-Request-Id') || 'unknown',
      }
    }

    throw new LumonApiError(errorData, response.status, retrySeconds)
  }

  // Check 204 No Content
  if (response.status === 204) {
    return null as T
  }

  return (await response.json()) as T
}
