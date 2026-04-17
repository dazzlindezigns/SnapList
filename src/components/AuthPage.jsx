import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Logo } from './Logo'

export default function AuthPage({ defaultMode = 'login' }) {
  const navigate = useNavigate()
  const [mode, setMode] = useState(defaultMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const reset = () => { setError(''); setSuccess('') }

  const handleLogin = async () => {
    setLoading(true); reset()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    const { data: profile } = await supabase.from('profiles').select('is_paid').eq('id', data.user.id).single()
    if (!profile?.is_paid) {
      await supabase.auth.signOut()
      setError("No active purchase found. Please purchase access first.")
      setLoading(false); return
    }
    navigate('/app')
    setLoading(false)
  }

  const handleSignup = async () => {
    setLoading(true); reset()
    const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } })
    if (error) { setError(error.message); setLoading(false); return }
    setSuccess("Check your email for a confirmation link! Once confirmed, come back and log in.")
    setLoading(false)
  }

  const handleForgot = async () => {
    setLoading(true); reset()
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback` })
    if (error) { setError(error.message); setLoading(false); return }
    setSuccess("Password reset email sent! Check your inbox.")
    setLoading(false)
  }

  const submit = mode === 'login' ? handleLogin : mode === 'signup' ? handleSignup : handleForgot

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #fff5fb 0%, #f5f0ff 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="fade-up" style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem', cursor: 'pointer' }} onClick={() => navigate('/')}>
          <Logo size={44} fontSize={26} />
        </div>

        <div style={{ background: '#fff', border: '1.5px solid rgba(145,113,189,0.15)', borderRadius: 24, padding: '2.25rem', boxShadow: '0 8px 40px rgba(145,113,189,0.12)' }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 900, marginBottom: 6, color: '#1a1a2e' }}>
            {mode === 'login' ? 'Welcome back! 👋' : mode === 'signup' ? 'Create your account ✨' : 'Reset your password'}
          </h2>
          <p style={{ fontSize: 14, color: '#888', marginBottom: '1.75rem', lineHeight: 1.6 }}>
            {mode === 'login' ? 'Log in to access your SnapList tool.' : mode === 'signup' ? 'Already purchased? Create your account to get started.' : "Enter your email and we'll send a reset link."}
          </p>

          {success ? (
            <div style={{ background: '#f0fff4', border: '1.5px solid #86efac', borderRadius: 10, padding: '1rem', fontSize: 14, color: '#166534', lineHeight: 1.6, marginBottom: '1rem' }}>{success}</div>
          ) : (
            <>
              <div className="input-group">
                <label className="input-label">Email address</label>
                <input className="input-field" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} />
              </div>
              {mode !== 'forgot' && (
                <div className="input-group">
                  <label className="input-label">Password</label>
                  <input className="input-field" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} />
                </div>
              )}
              {error && <p className="form-error" style={{ marginBottom: 12 }}>{error}</p>}
              <button className="btn-primary" onClick={submit} disabled={loading}>
                {loading ? <span className="spinner" /> : mode === 'login' ? 'Log in' : mode === 'signup' ? 'Create account' : 'Send reset link'}
              </button>
            </>
          )}

          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {mode === 'login' && <>
              <button className="btn-ghost" onClick={() => { setMode('forgot'); reset() }}>Forgot your password?</button>
              <button className="btn-ghost" onClick={() => { setMode('signup'); reset() }}>New here? Create an account</button>
            </>}
            {mode === 'signup' && <button className="btn-ghost" onClick={() => { setMode('login'); reset() }}>Already have an account? Log in</button>}
            {mode === 'forgot' && <button className="btn-ghost" onClick={() => { setMode('login'); reset() }}>Back to login</button>}
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 13, color: '#bbb', marginTop: 20 }}>
          Don't have access yet?{' '}
          <a href={import.meta.env.VITE_STRIPE_URL} target="_blank" rel="noopener noreferrer" style={{ color: '#9171BD', textDecoration: 'none', fontWeight: 600 }}>Get lifetime access — $19</a>
        </p>
        <p style={{ textAlign: 'center', marginTop: 8 }}>
          <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: '#bbb', cursor: 'pointer', fontSize: 13, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>← Back to home</button>
        </p>
      </div>
    </div>
  )
}
