import './style.css'

import { mountApp } from './app'

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('Application root element "#app" was not found.')
}

const title = import.meta.env.VITE_APP_TITLE || 'alex-0ahn-test-27'

document.title = title

mountApp({ root: app, title })
