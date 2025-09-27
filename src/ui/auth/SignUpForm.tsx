import { useState, type FormEvent } from 'react'
import supabase from '../../core/supabaseClient'

type AuthMode = 'signIn' | 'signUp'

const styles = {
  container: {
    maxWidth: '420px',
    margin: '4rem auto',
    padding: '2.5rem 2rem',
    borderRadius: '1rem',
    border: '1px solid #e2e8f0',
    boxShadow: '0 20px 45px rgba(15, 23, 42, 0.12)',
    fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    backgroundColor: '#ffffff',
    color: '#1e293b'
  },
  heading: {
    marginBottom: '0.75rem',
    fontSize: '1.5rem',
    fontWeight: 700
  },
  description: {
    marginBottom: '1.5rem',
    color: '#475569',
    lineHeight: 1.6
  },
  fieldset: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem'
  },
  label: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.35rem',
    fontWeight: 600,
    color: '#1e293b'
  },
  input: {
    padding: '0.75rem 1rem',
    borderRadius: '0.75rem',
    border: '1px solid #cbd5f5',
    fontSize: '1rem',
    backgroundColor: '#f8fafc',
    color: '#0f172a'
  },
  button: {
    marginTop: '1.25rem',
    padding: '0.8rem 1rem',
    borderRadius: '0.75rem',
    border: 'none',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    fontWeight: 600,
    fontSize: '1rem',
    cursor: 'pointer'
  },
  secondary: {
    marginTop: '1rem',
    textAlign: 'center' as const,
    color: '#475569'
  },
  toggleLink: {
    background: 'none',
    border: 'none',
    color: '#2563eb',
    textDecoration: 'underline',
    cursor: 'pointer',
    fontWeight: 600,
    padding: 0,
    marginLeft: '0.5rem'
  },
  feedback: {
    marginTop: '1rem',
    padding: '0.75rem 1rem',
    borderRadius: '0.75rem',
    backgroundColor: '#fee2e2',
    color: '#b91c1c'
  },
  success: {
    marginTop: '1rem',
    padding: '0.75rem 1rem',
    borderRadius: '0.75rem',
    backgroundColor: '#dcfce7',
    color: '#166534'
  }
} as const

const SignUpForm: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!email || !password) {
      setErrorMessage('Podaj adres e-mail i hasło, aby kontynuować.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)
    setInfoMessage(null)

    const normalizedEmail = email.trim().toLowerCase()

    try {
      if (mode === 'signUp') {
        const { error } = await supabase.auth.signUp({ email: normalizedEmail, password })

        if (error) {
          setErrorMessage(error.message)
        } else {
          setInfoMessage('Utworzono konto. Sprawdź skrzynkę pocztową, aby potwierdzić adres e-mail przed zalogowaniem.')
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password })

        if (error) {
          setErrorMessage(error.message)
        }
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Nie udało się połączyć z Supabase.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleMode = () => {
    setMode(current => (current === 'signIn' ? 'signUp' : 'signIn'))
    setErrorMessage(null)
    setInfoMessage(null)
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>{mode === 'signIn' ? 'Zaloguj się do MebloPlan' : 'Dołącz do MebloPlan'}</h1>
      <p style={styles.description}>
        Uzyskaj dostęp do panelu planowania po zalogowaniu. Jeżeli nie masz jeszcze konta, utwórz je za pomocą formularza poniżej.
      </p>

      <form onSubmit={handleSubmit} style={styles.fieldset}>
        <label style={styles.label} htmlFor="email">
          Adres e-mail
          <input
            id="email"
            type="email"
            name="email"
            autoComplete="email"
            style={styles.input}
            value={email}
            onChange={event => setEmail(event.target.value)}
            disabled={isSubmitting}
            required
          />
        </label>

        <label style={styles.label} htmlFor="password">
          Hasło
          <input
            id="password"
            type="password"
            name="password"
            autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
            style={styles.input}
            value={password}
            onChange={event => setPassword(event.target.value)}
            disabled={isSubmitting}
            minLength={6}
            required
          />
        </label>

        <button type="submit" style={styles.button} disabled={isSubmitting}>
          {isSubmitting ? 'Przetwarzanie...' : mode === 'signIn' ? 'Zaloguj się' : 'Utwórz konto'}
        </button>
      </form>

      {errorMessage ? (
        <div role="alert" style={styles.feedback}>
          {errorMessage}
        </div>
      ) : null}

      {infoMessage ? (
        <div role="status" style={styles.success}>
          {infoMessage}
        </div>
      ) : null}

      <p style={styles.secondary}>
        {mode === 'signIn' ? 'Nie masz konta?' : 'Masz już konto?'}
        <button type="button" style={styles.toggleLink} onClick={toggleMode}>
          {mode === 'signIn' ? 'Zarejestruj się' : 'Zaloguj się'}
        </button>
      </p>
    </div>
  )
}

export default SignUpForm
