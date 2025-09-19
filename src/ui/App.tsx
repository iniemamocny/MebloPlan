import { StrictMode, useEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import Dashboard from './Dashboard'

export const APP_TITLE = 'MebloPlan – panel planowania'

const App: React.FC = () => {
  useEffect(() => {
    document.title = APP_TITLE
  }, [])

  return (
    <StrictMode>
      <Dashboard />
    </StrictMode>
  )
}

export default App

export function mountApp(container: HTMLElement): Root {
  const root = createRoot(container)
  root.render(<App />)
  return root
}
