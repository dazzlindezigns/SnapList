import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Logo } from './Logo'

const BG = {
  position: 'fixed', inset: 0,
  background: `
    radial-gradient(ellipse 65% 55% at 15% 5%, rgba(145,113,189,0.22) 0%, transparent 55%),
    radial-gradient(ellipse 50% 50% at 88% 95%, rgba(255,102,196,0.16) 0%, transparent 55%),
    radial-gradient(ellipse 40% 40% at 65% 42%, rgba(56,182,255,0.08) 0%, transparent 50%)
  `,
  pointerEvents: 'none', zIndex: 0
}

const DOTS = {
  position: 'fixed', inset: 0,
  backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)',
  backgroundSize: '28px 28px', pointerEvents: 'none', zIndex: 0,
  maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)',
  WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)'
}

export default function AuthPage({ onAuth }) {
  const [mode, setMode] = useState('login') // login | signup | forgot
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const reset = () => { setError(''); setSuccess(''); }

  const handleLogin = async () => {
    setLoading(true); reset()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }

    // Check paid status
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_paid')
      .eq('id', data.user.id)
      .single()

    if (!profile?.is_paid) {
      await supabase.auth.signOut()
      setError("No active purchase found for this account. Please purchase access first.")
      setLoading(false); return
    }

    onAuth(data.user)
    setLoading(false)
  }

  const handleSignup = async () => {
    setLoading(true); reset()
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    setSuccess("Check your email for a confirmation link! Once confirmed, come back and log in.")
    setLoading(false)
  }

  const handleForgot = async () => {
    setLoading(true); reset()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })
    if (error) { setError(error.message); setLoading(false); return }
    setSuccess("Password reset email sent! Check your inbox.")
    setLoading(false)
  }

  const submit = mode === 'login' ? handleLogin : mode === 'signup' ? handleSignup : handleForgot

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', position: 'relative' }}>
      <div style={BG} />
      <div style={DOTS} />

      <div className="fade-up" style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
          <Logo size={44} fontSize={26} />
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(145,113,189,0.08)',
          border: '1px solid rgba(145,113,189,0.25)',
          borderRadius: 20, padding: '2rem'
        }}>
          <h2 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 24, fontWeight: 900,
            marginBottom: 6, color: 'var(--text)'
          }}>
            {mode === 'login' ? 'Welcome back' : mode === 'signup' ? 'Create your account' : 'Reset your password'}
          </h2>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            {mode === 'login' ? 'Log in to access your SnapList tool.' :
             mode === 'signup' ? 'Already purchased? Create your account to get started.' :
             "Enter your email and we'll send a reset link."}
          </p>

          {success ? (
            <div style={{
              background: 'rgba(56,182,255,0.1)', border: '1px solid rgba(56,182,255,0.25)',
              borderRadius: 10, padding: '1rem', fontSize: 14,
              color: '#90d8ff', lineHeight: 1.6, marginBottom: '1rem'
            }}>{success}</div>
          ) : (
            <>
              <div className="input-group">
                <label className="input-label">Email address</label>
                <input className="input-field" type="email" placeholder="you@example.com"
                  value={email} onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && submit()} />
              </div>

              {mode !== 'forgot' && (
                <div className="input-group">
                  <label className="input-label">Password</label>
                  <input className="input-field" type="password" placeholder="••••••••"
                    value={password} onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && submit()} />
                </div>
              )}

              {error && <p className="form-error" style={{ marginBottom: 12 }}>{error}</p>}

              <button className="btn-primary" onClick={submit} disabled={loading}>
                {loading ? <span className="spinner" /> :
                  mode === 'login' ? 'Log in' :
                  mode === 'signup' ? 'Create account' : 'Send reset link'}
              </button>
            </>
          )}

          {/* Mode switchers */}
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {mode === 'login' && <>
              <button className="btn-ghost" onClick={() => { setMode('forgot'); reset() }}>
                Forgot your password?
              </button>
              <button className="btn-ghost" onClick={() => { setMode('signup'); reset() }}>
                New here? Create an account
              </button>
            </>}
            {mode === 'signup' && (
              <button className="btn-ghost" onClick={() => { setMode('login'); reset() }}>
                Already have an account? Log in
              </button>
            )}
            {mode === 'forgot' && (
              <button className="btn-ghost" onClick={() => { setMode('login'); reset() }}>
                Back to login
              </button>
            )}
          </div>
        </div>

        {/* Purchase link */}
        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--faint)', marginTop: 20 }}>
          Don't have access yet?{' '}
          <a href="https://buy.stripe.com/cNi8wO2Y69Zz3MTcbEa3u05" target="_blank" rel="noopener noreferrer"
            style={{ color: 'var(--purple)', textDecoration: 'none' }}>
            Get lifetime access — $19
          </a>
        </p>
      </div>
    </div>
  )
}
