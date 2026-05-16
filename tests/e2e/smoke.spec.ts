import { expect, test } from '@playwright/test'

test('loads the landing page shell', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByTestId('app-title')).toHaveText('alex-0ahn-test-27')
  await expect(
    page.getByText(
      'Project scaffold is ready for the fluid simulation features.',
    ),
  ).toBeVisible()
})
