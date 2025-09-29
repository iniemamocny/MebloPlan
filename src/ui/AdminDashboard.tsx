import type { CSSProperties } from 'react'

const styles = {
  container: {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '2rem 1.5rem',
    fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    color: '#0f172a'
  },
  header: {
    marginBottom: '2rem',
    padding: '1.75rem',
    borderRadius: '1.25rem',
    background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
    color: '#eef2ff',
    boxShadow: '0 22px 55px rgba(99, 102, 241, 0.2)'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '1.25rem',
    marginBottom: '2rem'
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: '1rem',
    padding: '1.25rem',
    boxShadow: '0 12px 35px rgba(79, 70, 229, 0.14)',
    border: '1px solid #c7d2fe'
  },
  statValue: {
    fontSize: '2rem',
    fontWeight: 700,
    margin: 0,
    color: '#4338ca'
  },
  statLabel: {
    margin: 0,
    color: '#64748b'
  },
  section: {
    backgroundColor: '#f8fafc',
    borderRadius: '1rem',
    padding: '1.5rem',
    marginBottom: '1.5rem',
    border: '1px solid #e2e8f0'
  },
  sectionTitle: {
    marginTop: 0,
    marginBottom: '0.75rem',
    fontSize: '1.2rem',
    color: '#312e81'
  },
  list: {
    margin: 0,
    paddingLeft: '1.15rem',
    lineHeight: 1.6
  }
} satisfies Record<string, CSSProperties>

const usageStats = [
  { label: 'Aktywne konta', value: '128' },
  { label: 'Projekty w toku', value: '37' },
  { label: 'Średni czas wdrożenia', value: '12 dni' },
  { label: 'Zgłoszenia serwisowe', value: '5' }
]

const auditNotes = [
  'Zaplanowany przegląd uprawnień 15 maja – wymagane potwierdzenie liderów zespołów.',
  'Nowy regulator cen materiałów – konieczne dostosowanie widoków do lipca 2024.',
  'Zarchiwizowano 8 nieaktywnych kont wykonawców (Q1).'
]

const onboardingChecklist = [
  'Zweryfikuj rejestry logowań w Supabase i zgłoś odstępstwa.',
  'Monitoruj limity API oraz wykorzystanie przestrzeni plików.',
  'Przygotuj szkolenie z modułu wyceny dla nowych sprzedawców.'
]

const AdminDashboard: React.FC = () => {
  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={{ marginBottom: '0.5rem' }}>Konto administratora</h1>
        <p style={{ margin: 0 }}>
          Zarządzaj uprawnieniami, monitoruj kondycję systemu i planuj wdrożenia nowych funkcji. Krytyczne zmiany wymagają
          akceptacji dwóch administratorów.
        </p>
      </header>

      <div style={styles.statsGrid}>
        {usageStats.map(stat => (
          <article key={stat.label} style={styles.statCard}>
            <p style={styles.statValue}>{stat.value}</p>
            <p style={styles.statLabel}>{stat.label}</p>
          </article>
        ))}
      </div>

      <section style={styles.section} aria-labelledby="security-audit">
        <h2 id="security-audit" style={styles.sectionTitle}>
          Kontrola dostępu
        </h2>
        <ul style={styles.list}>
          {auditNotes.map(note => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </section>

      <section style={styles.section} aria-labelledby="onboarding">
        <h2 id="onboarding" style={styles.sectionTitle}>
          Zadania operacyjne
        </h2>
        <ul style={styles.list}>
          {onboardingChecklist.map(item => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section style={styles.section} aria-labelledby="support-info">
        <h2 id="support-info" style={styles.sectionTitle}>
          Wsparcie i eskalacje
        </h2>
        <p style={{ marginTop: 0 }}>
          Aktualne SLA dla zgłoszeń krytycznych: 4 godziny. W przypadku incydentów wysokiego ryzyka skorzystaj z kanału
          #incident-response w Slacku i poinformuj opiekuna klienta. Wszystkie działania audytowe dokumentujemy w Confluence.
        </p>
      </section>
    </div>
  )
}

export default AdminDashboard
