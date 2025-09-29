import { StrictMode, useEffect, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { Session } from '@supabase/supabase-js'
import ClientDashboard from './ClientDashboard'
import CarpenterDashboard from './CarpenterDashboard'
import AdminDashboard from './AdminDashboard'
import SignUpForm from './auth/SignUpForm'
import supabase from '../core/supabaseClient'

export const APP_TITLE = 'MebloPlan – panel planowania'

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    document.title = APP_TITLE
  }, [])

  useEffect(() => {
    let isMounted = true

    const loadSession = async () => {
      const { data, error } = await supabase.auth.getSession()

      if (error) {
        console.error('Błąd podczas pobierania sesji Supabase', error)
        if (isMounted) {
          setAuthError('Nie udało się pobrać sesji użytkownika. Odśwież stronę lub spróbuj ponownie później.')
        }
      }

      if (isMounted) {
        setSession(data.session ?? null)
        setIsLoading(false)
      }
    }

    void loadSession()

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setAuthError(null)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      setAuthError(error.message)
    }
  }

  if (isLoading) {
    return (
      <StrictMode>
        <div style={{ padding: '3rem', textAlign: 'center', fontFamily: 'Inter, system-ui, sans-serif' }}>
          Ładowanie danych logowania...
        </div>
      </StrictMode>
    )
  }

  const metadata = session?.user?.user_metadata as { role?: unknown } | undefined
  const rawRole = typeof metadata?.role === 'string' ? metadata.role.trim().toLowerCase() : ''
  const recognizedRole = rawRole === 'client' || rawRole === 'carpenter' || rawRole === 'admin' ? rawRole : null

  const fallbackNotice = (
    <div
      role="alert"
      style={{
        margin: '1rem auto 2rem',
        maxWidth: '960px',
        padding: '1.25rem 1.5rem',
        borderRadius: '1rem',
        backgroundColor: '#fef3c7',
        color: '#92400e',
        fontFamily: 'Inter, system-ui, sans-serif',
        boxShadow: '0 12px 30px rgba(202, 138, 4, 0.18)'
      }}
    >
      <h2 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Ograniczony dostęp</h2>
      <p style={{ margin: 0 }}>
        Nie udało się ustalić rodzaju Twojego konta. Skontaktuj się z administratorem, aby zweryfikować uprawnienia. Na
        potrzeby przeglądu udostępniamy bezpieczny widok katalogu w trybie tylko do odczytu.
      </p>
    </div>
  )

  return (
    <StrictMode>
      {session ? (
        <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
          <header
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              padding: '1rem 2rem',
              backgroundColor: '#1e293b',
              color: '#f8fafc'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span>Zalogowano jako {session.user.email ?? 'użytkownik'}</span>
              <button
                type="button"
                onClick={handleSignOut}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '9999px',
                  border: 'none',
                  backgroundColor: '#facc15',
                  color: '#1e293b',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Wyloguj się
              </button>
            </div>
          </header>
          {authError ? (
            <div
              role="alert"
              style={{
                margin: '1rem auto',
                maxWidth: '960px',
                padding: '1rem',
                borderRadius: '0.75rem',
                backgroundColor: '#fee2e2',
                color: '#b91c1c'
              }}
            >
              {authError}
            </div>
          ) : null}
          {recognizedRole === 'carpenter' ? (
            <CarpenterDashboard />
          ) : recognizedRole === 'admin' ? (
            <AdminDashboard />
          ) : (
            <>
              {recognizedRole === null && fallbackNotice}
              <ClientDashboard />
            </>
          )}
        </div>
      ) : (
        <>
          {authError ? (
            <div
              role="alert"
              style={{
                margin: '1rem auto',
                maxWidth: '480px',
                padding: '1rem',
                borderRadius: '0.75rem',
                backgroundColor: '#fee2e2',
                color: '#b91c1c',
                fontFamily: 'Inter, system-ui, sans-serif'
              }}
            >
              {authError}
            </div>
          ) : null}
          <SignUpForm />
        </>
      )}
    </StrictMode>
  )
}

export default App

export function mountApp(container: HTMLElement): Root {
  const root = createRoot(container)
  root.render(<App />)
  return root
}
