import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import LandingPage from './components/LandingPage'
import AuthPage from './components/AuthPage'
import MainApp from './components/MainApp'

const STRIPE_URL = 'https://buy.stripe.com/PLACEHOLDER'

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('landing')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_paid')
          .eq('id', session.user.id)
          .single()

        if (profile?.is_paid) {
          setUser(session.user)
          setView('app')
        } else {
          await supabase.auth.signOut()
        }
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) { setUser(null); setView('landing') }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleAuth = (authedUser) => {
    setUser(authedUser)
    setView('app')
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setView('landing')
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: 36, height: 36,
          border: '2px solid rgba(145,113,189,0.3)',
          borderTopColor: '#9171BD', borderRadius: '50%',
          animation: 'spin 0.7s linear infinite'
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (view === 'app' && user) return <MainApp user={user} onSignOut={handleSignOut} />
  if (view === 'auth') return <AuthPage onAuth={handleAuth} onBack={() => setView('landing')} />
  return <LandingPage onLogin={() => setView('auth')} stripeUrl={STRIPE_URL} />
}
