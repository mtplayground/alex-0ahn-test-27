import { expect, test } from '@playwright/test'

test('loads the landing page shell', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByTestId('app-title')).toHaveText('alex-0ahn-test-27')
  await expect(page.getByTestId('fluid-canvas')).toBeVisible()
  await expect(page.getByTestId('control-panel')).toBeVisible()
  await expect(page.getByTestId('resolution-value')).toHaveText('77 × 77')
  await expect(page.getByTestId('viscosity-value')).toHaveText('2.00e-5')
  await page.getByTestId('viscosity-slider').evaluate((element) => {
    const input = element as HTMLInputElement
    input.value = '0.0005'
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await expect(page.getByTestId('viscosity-value')).toHaveText('5.00e-4')
  await page.getByTestId('theme-select').selectOption('amber-heat')
  await expect(page.getByTestId('theme-select')).toHaveValue('amber-heat')
  await page.getByTestId('resolution-select').selectOption('128')
  await expect(page.getByTestId('resolution-select')).toHaveValue('128')
  await expect(page.getByTestId('resolution-value')).toHaveText('102 × 102')
  await page.setViewportSize({ width: 600, height: 600 })
  await expect(page.getByTestId('resolution-value')).toHaveText('85 × 85')
  await page.getByTestId('pause-button').click()
  await expect(page.getByTestId('pause-button')).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.getByTestId('pause-button').click()
  await expect(page.getByTestId('velocity-overlay-toggle')).toHaveAttribute(
    'aria-pressed',
    'false',
  )
  await page.getByTestId('velocity-overlay-toggle').click()
  await expect(page.getByTestId('velocity-overlay-toggle')).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.getByTestId('fluid-canvas').dispatchEvent('pointerdown', {
    clientX: 120,
    clientY: 120,
    pointerId: 1,
  })
  await page.getByTestId('fluid-canvas').dispatchEvent('pointermove', {
    clientX: 220,
    clientY: 160,
    pointerId: 1,
  })
  await page.getByTestId('fluid-canvas').dispatchEvent('pointerup', {
    clientX: 220,
    clientY: 160,
    pointerId: 1,
  })
  await page.getByTestId('reset-button').click()
  await expect(page.getByTestId('fps-counter')).not.toHaveText('0.0')
  await expect(
    page.getByText(
      'Drag across the canvas to inject velocity, press to seed density, and shape the flow with a floating control panel.',
    ),
  ).toBeVisible()
})
