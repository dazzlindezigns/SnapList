import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import AuthPage from './components/AuthPage'
import MainApp from './components/MainApp'

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing session on load
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        // Verify paid status
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_paid')
          .eq('id', session.user.id)
          .single()

        if (profile?.is_paid) {
          setUser(session.user)
        } else {
          await supabase.auth.signOut()
        }
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) setUser(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexDirection: 'column', gap: 16
      }}>
        <div style={{
          width: 36, height: 36,
          border: '2px solid rgba(145,113,189,0.3)',
          borderTopColor: '#9171BD',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite'
        }} />
        <p style={{ fontSize: 14, color: 'rgba(244,240,255,0.4)' }}>Loading...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return user
    ? <MainApp user={user} onSignOut={handleSignOut} />
    : <AuthPage onAuth={setUser} />
}
