import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './components/LandingPage'
import AuthPage from './components/AuthPage'
import MainApp from './components/MainApp'
import AuthCallback from './components/AuthCallback'
import ProtectedRoute from './components/ProtectedRoute'

const STRIPE_URL = import.meta.env.VITE_STRIPE_URL || 'https://buy.stripe.com/PLACEHOLDER'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage stripeUrl={STRIPE_URL} />} />
        <Route path="/login" element={<AuthPage defaultMode="login" />} />
        <Route path="/signup" element={<AuthPage defaultMode="signup" />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Protected app route */}
        <Route path="/app" element={
          <ProtectedRoute>
            <MainApp />
          </ProtectedRoute>
        } />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
