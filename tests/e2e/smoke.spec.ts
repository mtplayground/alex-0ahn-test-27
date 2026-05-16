import { expect, test } from '@playwright/test'

test('loads the landing page shell', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByTestId('app-title')).toHaveText('alex-0ahn-test-27')
  await expect(page.getByTestId('fluid-canvas')).toBeVisible()
  await expect(page.getByTestId('fps-counter')).not.toHaveText('0.0')
  await expect(
    page.getByText(
      'Density values are upsampled into ImageData and rendered with a water-blue palette.',
    ),
  ).toBeVisible()
})
