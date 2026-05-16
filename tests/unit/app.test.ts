import { describe, expect, it } from 'vitest'

import { renderApp } from '../../src/app'

describe('renderApp', () => {
  it('renders the application title into the root element', () => {
    const root = document.createElement('div')

    renderApp(root, 'Unit Test Title')

    expect(root.querySelector('[data-testid="app-title"]')?.textContent).toBe(
      'Unit Test Title',
    )
  })
})
