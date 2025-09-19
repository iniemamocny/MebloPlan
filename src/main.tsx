import { mountApp } from './ui'

const container = document.getElementById('root')

if (!container) {
  throw new Error('Root element with id "root" not found')
}

mountApp(container)
