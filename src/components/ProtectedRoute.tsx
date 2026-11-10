/* Praise Kier */
import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LoadingScreen } from './LoadingScreen'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredPermission?: string
  requiredClearance?: boolean
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermission,
  requiredClearance,
}) => {
  const { isAuthenticated, isLoading, hasPermission, authMe } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <LoadingScreen />
  }

  if (!isAuthenticated) {
    // Preserve entire current path and query string
    return (
      <Navigate
        to="/login"
        state={{ from: `${location.pathname}${location.search}` }}
        replace
      />
    )
  }

  // Check clearance requirement for Piso de Pruebas
  if (requiredClearance && !authMe?.clearance?.granted) {
    return <Navigate to="/unauthorized" state={{ reason: 'CLEARANCE_REQUIRED' }} replace />
  }

  // Check specific permission
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <Navigate
        to="/unauthorized"
        state={{ reason: 'PERMISSION_DENIED', permission: requiredPermission }}
        replace
      />
    )
  }

  return <>{children}</>
}
