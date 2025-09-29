import type { CSSProperties } from 'react'

const styles = {
  container: {
    maxWidth: '960px',
    margin: '0 auto',
    padding: '2rem 1.5rem',
    fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    color: '#111827'
  },
  header: {
    marginBottom: '2rem',
    padding: '1.5rem',
    borderRadius: '1rem',
    background: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)',
    color: '#1f2937',
    boxShadow: '0 18px 45px rgba(249, 115, 22, 0.2)'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1.5rem'
  },
  card: {
    padding: '1.5rem',
    borderRadius: '1rem',
    backgroundColor: '#fff7ed',
    border: '1px solid #fed7aa',
    boxShadow: '0 12px 35px rgba(249, 115, 22, 0.12)'
  },
  cardTitle: {
    marginTop: 0,
    fontSize: '1.15rem',
    marginBottom: '0.75rem',
    color: '#9a3412'
  },
  list: {
    margin: 0,
    paddingLeft: '1.1rem',
    lineHeight: 1.6,
    color: '#7c2d12'
  },
  badge: {
    display: 'inline-block',
    padding: '0.2rem 0.6rem',
    borderRadius: '999px',
    backgroundColor: '#fdba74',
    color: '#7c2d12',
    fontSize: '0.75rem',
    fontWeight: 600
  }
} satisfies Record<string, CSSProperties>

type InstallationTask = {
  id: string
  client: string
  address: string
  scheduledFor: string
  stage: 'pomiar' | 'produkcja' | 'montaż'
}

const installationPipeline: InstallationTask[] = [
  {
    id: 'MP-104',
    client: 'Nowakowie',
    address: 'Warszawa, ul. Modrzewiowa 4',
    scheduledFor: '2024-05-08',
    stage: 'montaż'
  },
  {
    id: 'MP-099',
    client: 'p. Borkowska',
    address: 'Gdańsk, ul. Myśliwska 18',
    scheduledFor: '2024-05-13',
    stage: 'produkcja'
  },
  {
    id: 'MP-097',
    client: 'Studio Loft 5',
    address: 'Łódź, ul. Włókiennicza 22',
    scheduledFor: '2024-05-17',
    stage: 'pomiar'
  }
]

const workshopAlerts = [
  'Uzupełnij zapas zawiasów typu Blum CLIP top (stan < 30 szt.)',
  'Potwierdź odbiór płyt EGGER H3331 ST10 – dostawa planowana na środę',
  'Przygotuj raport z reklamacji frontów lakierowanych za Q1'
]

const CarpenterDashboard: React.FC = () => {
  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={{ marginBottom: '0.5rem' }}>Konto stolarza</h1>
        <p style={{ margin: 0 }}>
          Tutaj znajdziesz harmonogram montaży, listy materiałowe i zgłoszenia serwisowe wymagające reakcji. Wszelkie
          zmiany w dokumentacji weryfikuje koordynator produkcji.
        </p>
      </header>

      <div style={styles.grid}>
        <section style={styles.card} aria-labelledby="upcoming-installations">
          <h2 id="upcoming-installations" style={styles.cardTitle}>
            Najbliższe realizacje
          </h2>
          <ul style={styles.list}>
            {installationPipeline.map(task => (
              <li key={task.id}>
                <strong>{task.id}</strong> – {task.client}, {task.address}
                <br />
                  <span style={{ fontSize: '0.9rem' }}>
                    Termin: {new Date(task.scheduledFor).toLocaleDateString('pl-PL')} •{' '}
                    <span style={styles.badge}>{task.stage.toUpperCase()}</span>
                  </span>
              </li>
            ))}
          </ul>
        </section>

        <section style={styles.card} aria-labelledby="workshop-checklist">
          <h2 id="workshop-checklist" style={styles.cardTitle}>
            Lista kontrolna warsztatu
          </h2>
          <ul style={styles.list}>
            {workshopAlerts.map(alert => (
              <li key={alert}>{alert}</li>
            ))}
          </ul>
        </section>

        <section style={styles.card} aria-labelledby="safety-notice">
          <h2 id="safety-notice" style={styles.cardTitle}>
            Bezpieczeństwo i dokumentacja
          </h2>
          <p style={{ marginTop: 0 }}>
            Pamiętaj o aktualizacji protokołów BHP po każdym montażu oraz o przesłaniu zdjęć z odbioru jakościowego w ciągu
            24 godzin. Dostęp do edycji projektów jest ograniczony – w razie potrzeby zmian skontaktuj się z działem
            projektowym.
          </p>
        </section>
      </div>
    </div>
  )
}

export default CarpenterDashboard
