export function renderApp(root: HTMLElement, title: string): void {
  root.innerHTML = `
    <main class="shell">
      <section class="panel">
        <p class="eyebrow">Vite + TypeScript</p>
        <h1 data-testid="app-title">${title}</h1>
        <p class="copy">Project scaffold is ready for the fluid simulation features.</p>
      </section>
    </main>
  `
}
