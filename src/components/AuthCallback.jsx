import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Logo } from './Logo'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('Confirming your account...')

  useEffect(() => {
    const handleCallback = async () => {
      const { data, error } = await supabase.auth.getSession()

      if (error) {
        setStatus('Something went wrong. Please try logging in.')
        setTimeout(() => navigate('/login'), 3000)
        return
      }

      if (data.session?.user) {
        // Check paid status
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_paid')
          .eq('id', data.session.user.id)
          .single()

        if (profile?.is_paid) {
          setStatus('Account confirmed! Taking you to the app...')
          setTimeout(() => navigate('/app'), 1500)
        } else {
          setStatus('Email confirmed! Please log in to access your account.')
          setTimeout(() => navigate('/login'), 2000)
        }
      } else {
        setStatus('Email confirmed! Please log in.')
        setTimeout(() => navigate('/login'), 2000)
      }
    }

    handleCallback()
  }, [navigate])

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 24,
      background: '#1a1720'
    }}>
      <Logo size={44} fontSize={26} />
      <div style={{
        width: 36, height: 36,
        border: '2px solid rgba(145,113,189,0.3)',
        borderTopColor: '#9171BD', borderRadius: '50%',
        animation: 'spin 0.7s linear infinite'
      }} />
      <p style={{ fontSize: 15, color: 'rgba(244,240,255,0.6)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {status}
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
