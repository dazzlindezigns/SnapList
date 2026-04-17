import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ProtectedRoute({ children }) {
  const [status, setStatus] = useState('loading') // loading | allowed | denied

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) { setStatus('denied'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_paid')
        .eq('id', session.user.id)
        .single()

      setStatus(profile?.is_paid ? 'allowed' : 'denied')
    })
  }, [])

  if (status === 'loading') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1720' }}>
        <div style={{ width: 36, height: 36, border: '2px solid rgba(145,113,189,0.3)', borderTopColor: '#9171BD', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (status === 'denied') return <Navigate to="/login" replace />
  return children
}
