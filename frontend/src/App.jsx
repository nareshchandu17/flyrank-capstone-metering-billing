import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import FramerLayout from './components/FramerLayout';
import { Loader2 } from 'lucide-react';

const Landing = lazy(() => import('./pages/Landing'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const FramerDashboard = lazy(() => import('./pages/FramerDashboard'));
const FramerTenants = lazy(() => import('./pages/FramerTenants'));
const FramerUsage = lazy(() => import('./pages/FramerUsage'));
const FramerHistory = lazy(() => import('./pages/FramerHistory'));
const FramerSettings = lazy(() => import('./pages/FramerSettings'));

const PageFallback = () => (
  <div className="min-h-[50vh] flex items-center justify-center">
    <Loader2 className="w-6 h-6 animate-spin text-[#4D7C0F]" />
  </div>
);

/**
 * PublicRoute — only renders children when the user is NOT authenticated.
 * While Auth0 is initialising → show a spinner (never flash the landing page).
 * Once authenticated → immediately redirect to /dashboard.
 */
function PublicRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070b14] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#D4FF28]" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function App() {
  return (
    <AuthProvider>
      <Router>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              {/* Public-only routes — authenticated users are redirected to /dashboard */}
              <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
              <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />

                  {/* Authenticated Dashboard Routes */}
                  <Route element={<ProtectedRoute />}>
                    <Route path="/dashboard" element={<FramerLayout />}>
                      <Route index element={<FramerDashboard />} />
                      <Route path="tenants" element={<FramerTenants />} />
                      <Route path="usage" element={<FramerUsage />} />
                      <Route path="history" element={<FramerHistory />} />
                      <Route path="settings" element={<FramerSettings />} />
                    </Route>
                  </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Router>
    </AuthProvider >
  );
}

export default App;
