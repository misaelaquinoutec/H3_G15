/* Praise Kier */
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { checkHealth } from '../api/auth'

interface HealthContextType {
  isHealthy: boolean
  isChecking: boolean
  retryCountdown: number
  manualRetry: () => Promise<void>
}

const HealthContext = createContext<HealthContextType | undefined>(undefined)

export const HealthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isHealthy, setIsHealthy] = useState<boolean>(true)
  const [isChecking, setIsChecking] = useState<boolean>(false)
  const [retryCountdown, setRetryCountdown] = useState<number>(0)
  const backoffRef = useRef<number>(2)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const verifyHealth = useCallback(async (): Promise<boolean> => {
    setIsChecking(true)
    try {
      await checkHealth()
      setIsHealthy(true)
      backoffRef.current = 2
      setRetryCountdown(0)
      if (timerRef.current) clearTimeout(timerRef.current)
      if (intervalRef.current) clearInterval(intervalRef.current)
      return true
    } catch {
      setIsHealthy(false)
      const nextDelay = Math.min(backoffRef.current, 30)
      backoffRef.current = Math.min(backoffRef.current * 1.5, 30)
      setRetryCountdown(Math.round(nextDelay))

      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = setInterval(() => {
        setRetryCountdown((prev) => {
          if (prev <= 1) {
            if (intervalRef.current) clearInterval(intervalRef.current)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        verifyHealth()
      }, nextDelay * 1000)
      return false
    } finally {
      setIsChecking(false)
    }
  }, [])

  useEffect(() => {
    verifyHealth()
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [verifyHealth])

  const manualRetry = async () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (intervalRef.current) clearInterval(intervalRef.current)
    await verifyHealth()
  }

  return (
    <HealthContext.Provider
      value={{
        isHealthy,
        isChecking,
        retryCountdown,
        manualRetry,
      }}
    >
      {children}
    </HealthContext.Provider>
  )
}

export const useHealth = (): HealthContextType => {
  const context = useContext(HealthContext)
  if (!context) {
    throw new Error('useHealth must be used within a HealthProvider')
  }
  return context
}
