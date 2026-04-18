import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const STRIPE_URL = import.meta.env.VITE_STRIPE_URL || 'https://buy.stripe.com/PLACEHOLDER'

function UpgradeWall() {
  const [email, setEmail] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) setEmail(session.user.email)
    })
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(145deg, #f5f0ff 0%, #fff5fb 50%, #f0f4ff 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '2rem 1rem',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }}>
      <div style={{
        maxWidth: 460, width: '100%',
        background: '#fff',
        borderRadius: 24,
        padding: '2.5rem 2rem',
        boxShadow: '0 8px 40px rgba(145,113,189,0.12)',
        border: '1.5px solid rgba(145,113,189,0.15)',
        textAlign: 'center'
      }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'linear-gradient(135deg, #9171BD, #FF66C4)',
            borderRadius: 14, padding: '8px 18px'
          }}>
            <span style={{
              fontFamily: "'Playfair Display', serif",
              fontWeight: 900, fontSize: 18, color: '#fff'
            }}>Snap<span style={{ color: '#ffe0f5' }}>.</span>List</span>
          </div>
        </div>

        <div style={{ fontSize: 36, marginBottom: '1rem' }}>✨</div>

        <h2 style={{
          fontFamily: "'Playfair Display', serif",
          fontWeight: 900, fontSize: '1.6rem',
          color: '#1a1a2e', marginBottom: '0.75rem', lineHeight: 1.3
        }}>
          One more step to get in!
        </h2>

        <p style={{ fontSize: 14, color: '#666', lineHeight: 1.75, marginBottom: '0.5rem' }}>
          Hey{email ? ` ${email.split('@')[0]}` : ''}! Your account is ready — you just need to complete your purchase to unlock everything.
        </p>

        <p style={{ fontSize: 13, color: '#aaa', marginBottom: '2rem', lineHeight: 1.6 }}>
          Unlimited listings · 10 AI mockups per product · All platforms · Yours forever
        </p>

        <div style={{
          background: 'linear-gradient(135deg, #f5f0ff, #fff5fb)',
          border: '1.5px solid rgba(145,113,189,0.15)',
          borderRadius: 16, padding: '1.25rem', marginBottom: '1.5rem'
        }}>
          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '3rem', fontWeight: 900,
            background: 'linear-gradient(135deg, #9171BD, #FF66C4)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text', lineHeight: 1
          }}>$19</div>
          <div style={{ fontSize: 13, color: '#aaa', marginTop: 4 }}>one-time · lifetime access</div>
        </div>

        <a
          href={STRIPE_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block', width: '100%', padding: '15px 24px',
            background: 'linear-gradient(135deg, #9171BD, #FF66C4)',
            color: '#fff', borderRadius: 14, fontWeight: 700,
            fontSize: 15, textDecoration: 'none',
            boxShadow: '0 6px 20px rgba(145,113,189,0.35)',
            marginBottom: '1rem'
          }}
        >
          Complete Purchase — $19 ✨
        </a>

        <p style={{ fontSize: 12, color: '#bbb', marginBottom: '1.5rem' }}>
          After payment, come back and log in — you'll be in instantly.
        </p>

        <button
          onClick={handleSignOut}
          style={{
            background: 'none', border: 'none',
            fontSize: 13, color: '#bbb', cursor: 'pointer',
            textDecoration: 'underline', fontFamily: "'Plus Jakarta Sans', sans-serif"
          }}
        >
          Sign out
        </button>
      </div>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@900&family=Plus+Jakarta+Sans:wght@400;600;700&display=swap');`}</style>
    </div>
  )
}

export default function ProtectedRoute({ children }) {
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) { setStatus('denied'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_paid')
        .eq('id', session.user.id)
        .single()

      setStatus(profile?.is_paid ? 'allowed' : 'unpaid')
    })
  }, [])

  if (status === 'loading') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f0ff' }}>
        <div style={{ width: 36, height: 36, border: '2px solid rgba(145,113,189,0.3)', borderTopColor: '#9171BD', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (status === 'denied') return <Navigate to="/login" replace />
  if (status === 'unpaid') return <UpgradeWall />
  return children
}
