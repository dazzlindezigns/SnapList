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
        const user = data.session.user
        const email = user.email?.toLowerCase()

        // Check paid status
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_paid')
          .eq('id', user.id)
          .single()

        if (profile?.is_paid) {
          setStatus('Account confirmed! Taking you to the app...')
          setTimeout(() => navigate('/app'), 1500)
          return
        }

        // Not paid yet — check pending_purchases for their email
        setStatus('Checking your purchase...')
        const { data: pending } = await supabase
          .from('pending_purchases')
          .select('email')
          .eq('email', email)
          .single()

        if (pending) {
          // Found a pending purchase — grant access
          setStatus('Purchase confirmed! Setting up your account...')
          await supabase
            .from('profiles')
            .upsert({ id: user.id, is_paid: true })

          // Clean up pending purchase
          await supabase
            .from('pending_purchases')
            .delete()
            .eq('email', email)

          setStatus('All set! Taking you to the app ✨')
          setTimeout(() => navigate('/app'), 1500)
        } else {
          // No pending purchase found
          setStatus('Email confirmed! Please log in.')
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
      background: 'linear-gradient(145deg, #f5f0ff 0%, #fff5fb 50%, #f0f4ff 100%)'
    }}>
      <Logo size={44} fontSize={26} />
      <div style={{
        width: 36, height: 36,
        border: '2px solid rgba(145,113,189,0.3)',
        borderTopColor: '#9171BD', borderRadius: '50%',
        animation: 'spin 0.7s linear infinite'
      }} />
      <p style={{ fontSize: 15, color: '#9171BD', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600 }}>
        {status}
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
