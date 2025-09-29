import { useMemo, useState, type CSSProperties } from 'react'
import { FAMILY, FAMILY_LABELS, KIND_SETS, type Kind } from '../core/catalog'

const styles = {
  container: {
    maxWidth: '960px',
    margin: '0 auto',
    padding: '2rem 1.5rem',
    fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    color: '#1f2933'
  },
  accountHeader: {
    marginBottom: '2rem',
    padding: '1.5rem',
    borderRadius: '1rem',
    background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
    boxShadow: '0 10px 30px rgba(59, 130, 246, 0.12)'
  },
  panelHeader: {
    marginBottom: '1.5rem'
  },
  familyList: {
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap',
    marginBottom: '1.5rem'
  },
  familyButton: (active: boolean): CSSProperties => ({
    padding: '0.5rem 1rem',
    borderRadius: '9999px',
    border: active ? '2px solid #2563eb' : '1px solid #cbd5e1',
    backgroundColor: active ? '#dbeafe' : '#fff',
    color: active ? '#1d4ed8' : '#334155',
    cursor: 'pointer',
    fontWeight: active ? 600 : 500,
    transition: 'all 0.2s ease'
  }),
  summary: {
    background: '#f1f5f9',
    padding: '1rem',
    borderRadius: '0.75rem',
    marginBottom: '1.5rem',
    lineHeight: 1.5
  },
  viewToggle: {
    display: 'flex',
    gap: '0.75rem',
    marginBottom: '1rem',
    alignItems: 'center'
  },
  toggleButton: (active: boolean): CSSProperties => ({
    padding: '0.4rem 0.9rem',
    borderRadius: '0.5rem',
    border: active ? '2px solid #0ea5e9' : '1px solid #cbd5e1',
    backgroundColor: active ? '#e0f2fe' : '#fff',
    color: '#0369a1',
    cursor: 'pointer',
    fontWeight: active ? 600 : 500,
    transition: 'all 0.2s ease'
  }),
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: '#fff',
    borderRadius: '0.75rem',
    overflow: 'hidden',
    boxShadow: '0 8px 30px rgba(15, 23, 42, 0.08)'
  },
  th: {
    textAlign: 'left' as const,
    padding: '0.75rem 1rem',
    backgroundColor: '#eff6ff',
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#1e3a8a',
    borderBottom: '1px solid #dbeafe'
  },
  td: {
    padding: '0.75rem 1rem',
    borderBottom: '1px solid #e2e8f0',
    fontSize: '0.95rem',
    backgroundColor: '#fff'
  },
  cardsGrid: {
    display: 'grid',
    gap: '1rem',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))'
  },
  card: {
    borderRadius: '0.75rem',
    border: '1px solid #e2e8f0',
    padding: '1rem',
    background: '#fff',
    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.05)'
  },
  cardTitle: {
    fontSize: '1.05rem',
    fontWeight: 600,
    marginBottom: '0.5rem',
    color: '#0f172a'
  },
  cardList: {
    margin: 0,
    paddingLeft: '1.1rem',
    lineHeight: 1.5,
    color: '#475569'
  }
} satisfies Record<string, unknown>

type ViewMode = 'tabela' | 'karty'

function buildVariantsDescription(kinds: Kind[]): string {
  const totalVariants = kinds.reduce((sum, kind) => sum + kind.variants.length, 0)
  if (totalVariants === 0) {
    return 'Ta rodzina nie ma zdefiniowanych wariantów. Dodaj własne moduły w panelu konfiguracji.'
  }
  const categoriesWithSingle = kinds.filter(kind => kind.variants.length === 1)
  const categoriesWithMany = kinds.filter(kind => kind.variants.length > 1)
  const fragments: string[] = []
  if (categoriesWithSingle.length > 0) {
    fragments.push(
      `${categoriesWithSingle.length} kategor${categoriesWithSingle.length === 1 ? 'ia' : 'ie'} oferuj${
        categoriesWithSingle.length === 1 ? 'e' : 'ą'
      } pojedynczy wariant`
    )
  }
  if (categoriesWithMany.length > 0) {
    const count = categoriesWithMany.reduce((sum, kind) => sum + kind.variants.length, 0)
    fragments.push(`${categoriesWithMany.length} grupy dostarczają łącznie ${count} warianty`)
  }
  return `Łącznie dostępnych jest ${totalVariants} wariantów. ${fragments.join('. ')}`
}

const ClientDashboard: React.FC = () => {
  const [selectedFamily, setSelectedFamily] = useState<FAMILY>(FAMILY.BASE)
  const [viewMode, setViewMode] = useState<ViewMode>('tabela')

  const kinds = KIND_SETS[selectedFamily]
  const variantCount = useMemo(
    () => kinds.reduce((sum, kind) => sum + Math.max(1, kind.variants.length), 0),
    [kinds]
  )
  const description = useMemo(() => buildVariantsDescription(kinds), [kinds])

  const handleFamilyChange = (family: FAMILY) => {
    setSelectedFamily(family)
  }

  const handleViewChange = (next: ViewMode) => {
    setViewMode(next)
  }

  return (
    <div style={styles.container}>
      <header style={styles.accountHeader}>
        <h1 style={{ marginBottom: '0.25rem' }}>Konto klienta</h1>
        <p style={{ margin: 0 }}>
          Możesz przeglądać katalog modułów, zestawiać warianty i przygotowywać listy pytań dla projektanta. Wszystkie dane
          prezentujemy w trybie tylko do odczytu, aby zachować bezpieczeństwo konfiguracji.
        </p>
      </header>

      <section style={styles.panelHeader} aria-labelledby="planning-panel-heading">
        <h2 id="planning-panel-heading">Panel planowania korpusów</h2>
        <p>
          W tym miejscu przejrzysz dostępne moduły kuchenne i wybierzesz najlepszą konfigurację dla swojego projektu. Wybierz
          rodzinę korpusów, aby zobaczyć szczegółowe warianty i liczebność.
        </p>
      </section>

      <section aria-labelledby="families-heading">
        <h3 id="families-heading">Rodziny korpusów</h3>
        <p>Wskaż rodzinę, aby zobaczyć odpowiadające jej moduły.</p>
        <div style={styles.familyList}>
          {Object.values(FAMILY).map(family => (
            <button
              key={family}
              type="button"
              style={styles.familyButton(family === selectedFamily)}
              onClick={() => handleFamilyChange(family)}
              aria-pressed={family === selectedFamily}
            >
              {FAMILY_LABELS[family]}
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="summary-heading" style={styles.summary}>
        <h4 id="summary-heading" style={{ marginTop: 0 }}>
          Podsumowanie wybranej rodziny
        </h4>
        <p>
          Wybrana rodzina: <strong>{FAMILY_LABELS[selectedFamily]}</strong>.
        </p>
        <p>
          Łączna liczba kategorii modułów: <strong>{kinds.length}</strong>.
        </p>
        <p>
          Łączna liczba wariantów w rodzinie: <strong>{variantCount}</strong>.
        </p>
        <p>{description}</p>
      </section>

      <section aria-labelledby="variants-heading">
        <div style={styles.viewToggle}>
          <h3 id="variants-heading" style={{ margin: 0 }}>
            Warianty modułów
          </h3>
          <div role="group" aria-label="Zmiana sposobu prezentacji">
            <button
              type="button"
              style={styles.toggleButton(viewMode === 'tabela')}
              onClick={() => handleViewChange('tabela')}
            >
              Widok tabeli
            </button>
            <button
              type="button"
              style={styles.toggleButton(viewMode === 'karty')}
              onClick={() => handleViewChange('karty')}
            >
              Widok kafelkowy
            </button>
          </div>
        </div>

        {viewMode === 'tabela' ? (
          <table style={styles.table} aria-label="Tabela wariantów">
            <thead>
              <tr>
                <th style={styles.th}>Kategoria</th>
                <th style={styles.th}>Opis</th>
                <th style={styles.th}>Warianty</th>
              </tr>
            </thead>
            <tbody>
              {kinds.map(kind => (
                <tr key={kind.key}>
                  <td style={styles.td}>{kind.label}</td>
                  <td style={styles.td}>
                    {kind.variants.length > 0
                      ? `Rodzina ${FAMILY_LABELS[selectedFamily]} oferuje ${kind.variants.length} wariant${
                          kind.variants.length === 1 ? '' : 'y'
                        } w tej kategorii.`
                      : 'Brak wariantów — możesz dodać własne moduły.'}
                  </td>
                  <td style={styles.td}>
                    {kind.variants.length > 0
                      ? kind.variants.map(variant => variant.label).join(', ')
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={styles.cardsGrid} role="list" aria-label="Lista wariantów">
            {kinds.map(kind => (
              <article style={styles.card} key={kind.key} role="listitem">
                <h4 style={styles.cardTitle}>{kind.label}</h4>
                {kind.variants.length > 0 ? (
                  <ul style={styles.cardList}>
                    {kind.variants.map(variant => (
                      <li key={variant.key}>{variant.label}</li>
                    ))}
                  </ul>
                ) : (
                  <p>Brak zdefiniowanych wariantów.</p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <footer style={{ marginTop: '2rem', fontSize: '0.85rem', color: '#64748b' }}>
        Wskazówka: kliknij w różne rodziny, aby od razu zobaczyć zmiany w dostępnych modułach. Dane pochodzą z wbudowanego
        katalogu MebloPlan i są prezentowane w języku polskim.
      </footer>
    </div>
  )
}

export default ClientDashboard
