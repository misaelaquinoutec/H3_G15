/* Praise Kier */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import {
  getAccessToken,
  getStoredRefreshToken,
  refreshSession,
  subscribeToAuthChanges,
} from '../api/client'
import {
  loginCrew,
  registerCrew,
  logoutCrew,
  getAuthMe,
  type LoginPayload,
  type RegisterPayload,
} from '../api/auth'
import type { AuthMeResponse, AuthUser } from '../api/types'

interface AuthContextType {
  user: AuthUser | null
  authMe: AuthMeResponse | null
  isAuthenticated: boolean
  isLoading: boolean
  revocationReason: string | null
  clearRevocationReason: () => void
  login: (payload: LoginPayload) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  logout: () => Promise<void>
  refreshUserData: () => Promise<void>
  hasPermission: (permission: string) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [authMe, setAuthMe] = useState<AuthMeResponse | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [revocationReason, setRevocationReason] = useState<string | null>(null)

  const clearRevocationReason = useCallback(() => {
    setRevocationReason(null)
  }, [])

  const refreshUserData = useCallback(async () => {
    try {
      const data = await getAuthMe()
      setAuthMe(data)
      setUser({
        id: data.id,
        email: data.email,
        displayName: data.displayName,
      })
    } catch {
      // Failed to get /auth/me
    }
  }, [])

  // Initial session restoration on mount without flashing login
  useEffect(() => {
    let isMounted = true

    const restoreSession = async () => {
      const hasToken = getAccessToken()
      const hasRefreshToken = getStoredRefreshToken()

      if (hasToken) {
        try {
          const data = await getAuthMe()
          if (isMounted) {
            setAuthMe(data)
            setUser({ id: data.id, email: data.email, displayName: data.displayName })
          }
        } catch {
          // Access token might be invalid
        }
      } else if (hasRefreshToken) {
        try {
          const newToken = await refreshSession()
          if (newToken && isMounted) {
            const data = await getAuthMe()
            if (isMounted) {
              setAuthMe(data)
              setUser({ id: data.id, email: data.email, displayName: data.displayName })
            }
          }
        } catch {
          // Refresh failed
        }
      }

      if (isMounted) {
        setIsLoading(false)
      }
    }

    restoreSession()

    // Subscribe to multi-tab auth updates
    const unsubscribe = subscribeToAuthChanges((authenticated, reason) => {
      if (!authenticated) {
        setUser(null)
        setAuthMe(null)
        if (reason) {
          setRevocationReason(reason)
        }
      } else {
        refreshUserData()
      }
    })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [refreshUserData])

  const handleLogin = async (payload: LoginPayload) => {
    setIsLoading(true)
    try {
      const authRes = await loginCrew(payload)
      setUser(authRes.user)
      const meData = await getAuthMe()
      setAuthMe(meData)
      setRevocationReason(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (payload: RegisterPayload) => {
    setIsLoading(true)
    try {
      const authRes = await registerCrew(payload)
      setUser(authRes.user)
      const meData = await getAuthMe()
      setAuthMe(meData)
      setRevocationReason(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    setIsLoading(true)
    try {
      await logoutCrew()
      setUser(null)
      setAuthMe(null)
    } finally {
      setIsLoading(false)
    }
  }

  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!authMe || !authMe.permissions) return false
      return authMe.permissions.includes(permission)
    },
    [authMe]
  )

  const isAuthenticated = Boolean(user && (getAccessToken() || getStoredRefreshToken()))

  return (
    <AuthContext.Provider
      value={{
        user,
        authMe,
        isAuthenticated,
        isLoading,
        revocationReason,
        clearRevocationReason,
        login: handleLogin,
        register: handleRegister,
        logout: handleLogout,
        refreshUserData,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
