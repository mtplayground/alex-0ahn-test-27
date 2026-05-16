import { expect, test } from '@playwright/test'

test('loads the landing page shell', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByTestId('app-title')).toHaveText('alex-0ahn-test-27')
  await expect(page.getByTestId('fluid-canvas')).toBeVisible()
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
  await expect(page.getByTestId('fps-counter')).not.toHaveText('0.0')
  await expect(
    page.getByText(
      'Drag across the canvas to inject velocity, and press to seed density into the water-blue field.',
    ),
  ).toBeVisible()
})
