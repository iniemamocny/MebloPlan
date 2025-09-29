import { useState, type FormEvent } from 'react'
import supabase from '../../core/supabaseClient'

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

const AdminSetupPage: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [secret, setSecret] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const expectedSecret = (import.meta.env.VITE_ADMIN_SETUP_SECRET ?? '').toString().trim()

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setErrorMessage(null)
    setInfoMessage(null)

    if (!email || !password) {
      setErrorMessage('Podaj adres e-mail i hasło, aby kontynuować.')
      return
    }

    if (!expectedSecret) {
      setErrorMessage('Brakuje konfiguracji sekretu administratora. Dodaj zmienną VITE_ADMIN_SETUP_SECRET i spróbuj ponownie.')
      return
    }

    if (secret.trim() !== expectedSecret) {
      setErrorMessage('Nieprawidłowy kod administratora. Sprawdź konfigurację i spróbuj ponownie.')
      return
    }

    setIsSubmitting(true)

    try {
      const normalizedEmail = email.trim().toLowerCase()
      const { error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            role: 'admin'
          }
        }
      })

      if (error) {
        setErrorMessage(error.message)
      } else {
        setInfoMessage('Utworzono konto administratora. Sprawdź skrzynkę pocztową, aby potwierdzić adres e-mail przed zalogowaniem.')
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Nie udało się połączyć z Supabase.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>Konfiguracja konta administratora</h1>
      <p style={styles.description}>
        Formularz pozwala utworzyć pierwszego administratora platformy. Wprowadź tajny kod konfiguracji oraz dane logowania.
        Kod nie jest zapisywany w Supabase i służy jedynie do weryfikacji, że masz dostęp do środowiska wdrożeniowego.
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
            autoComplete="new-password"
            style={styles.input}
            value={password}
            onChange={event => setPassword(event.target.value)}
            disabled={isSubmitting}
            minLength={6}
            required
          />
        </label>

        <label style={styles.label} htmlFor="adminSecret">
          Kod administratora
          <input
            id="adminSecret"
            type="password"
            name="adminSecret"
            style={styles.input}
            value={secret}
            onChange={event => setSecret(event.target.value)}
            disabled={isSubmitting}
            required
          />
        </label>

        <button
          type="submit"
          style={styles.button}
          disabled={isSubmitting || !email || !password || !secret}
        >
          {isSubmitting ? 'Przetwarzanie...' : 'Utwórz konto administratora'}
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
    </div>
  )
}

export default AdminSetupPage
