/* Praise Kier */
import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { HealthProvider } from './context/HealthContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { LoadingScreen } from './components/LoadingScreen'

// Auth & base pages bundled eagerly
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { Unauthorized } from './pages/Unauthorized'
import { NotFound } from './pages/NotFound'

// Lazy-loaded pages for bundle size optimization (< 180 KB initial JS)
const Files = lazy(() => import('./pages/Files').then((m) => ({ default: m.Files })))
const Refine = lazy(() => import('./pages/Refine').then((m) => ({ default: m.Refine })))
const Status = lazy(() => import('./pages/Status').then((m) => ({ default: m.Status })))
const Refiners = lazy(() => import('./pages/Refiners').then((m) => ({ default: m.Refiners })))
const Incidents = lazy(() => import('./pages/Incidents').then((m) => ({ default: m.Incidents })))

export default function App() {
  return (
    <ErrorBoundary>
      <HealthProvider>
        <AuthProvider>
          <BrowserRouter>
            <Suspense fallback={<LoadingScreen />}>
              <Routes>
                {/* Public Auth Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Protected App Routes with Lumon Layout */}
                <Route element={<Layout />}>
                  <Route path="/" element={<Navigate to="/files" replace />} />
                  <Route
                    path="/files"
                    element={
                      <ProtectedRoute requiredPermission="files:read">
                        <Files />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/files/:id/refine"
                    element={
                      <ProtectedRoute requiredPermission="files:refine">
                        <Refine />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/refiners"
                    element={
                      <ProtectedRoute requiredPermission="refiners:read">
                        <Refiners />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/incidents"
                    element={
                      <ProtectedRoute requiredPermission="incidents:read">
                        <Incidents />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/estado"
                    element={
                      <ProtectedRoute>
                        <Status />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/unauthorized" element={<Unauthorized />} />
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </HealthProvider>
    </ErrorBoundary>
  )
}
