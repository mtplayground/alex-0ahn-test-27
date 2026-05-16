import './style.css'

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('Application root element "#app" was not found.')
}

const title = import.meta.env.VITE_APP_TITLE || 'alex-0ahn-test-27'

document.title = title

app.innerHTML = `
  <main class="shell">
    <section class="panel">
      <p class="eyebrow">Vite + TypeScript</p>
      <h1>${title}</h1>
      <p class="copy">Project scaffold is ready for the fluid simulation features.</p>
    </section>
  </main>
`
