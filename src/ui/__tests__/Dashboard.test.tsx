import { describe, it, expect } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import Dashboard from '../Dashboard'

describe('Dashboard', () => {
  it('pozwala na przełączanie rodzin i widoków', () => {
    render(<Dashboard />)

    expect(
      screen.getByRole('heading', { name: 'Panel planowania korpusów' })
    ).toBeInTheDocument()

    const summaryFamily = screen.getByText(/Wybrana rodzina:/)
    expect(summaryFamily).toHaveTextContent('Dolna')

    fireEvent.click(screen.getByRole('button', { name: 'Słupek' }))

    expect(screen.getByText(/Wybrana rodzina:/)).toHaveTextContent('Słupek')
    expect(screen.getByText(/Łączna liczba kategorii modułów:/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Widok kafelkowy' }))

    expect(screen.getByRole('heading', { name: 'Słupki' })).toBeInTheDocument()
    expect(screen.getByText('Piekarnik')).toBeInTheDocument()
  })
})
