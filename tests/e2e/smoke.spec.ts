import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

test.describe('critical canvas path', () => {
  test('shows the canvas and changes pixels after a drag interaction', async ({
    page,
  }) => {
    await page.goto('/')

    await expect(page.getByTestId('fluid-canvas')).toBeVisible()

    const before = await readCanvasStats(page)

    await dragOnCanvas(page, {
      from: { x: 160, y: 160 },
      to: { x: 280, y: 210 },
    })
    await page.waitForTimeout(150)

    const after = await readCanvasStats(page)

    expect(after.lumaSum).toBeGreaterThan(before.lumaSum + 10_000)
    expect(after.changedPixels).toBeGreaterThan(250)
  })

  test('changing a control slider affects the rendered output', async ({
    page,
  }) => {
    await page.goto('/')

    await page.getByTestId('pause-button').click()
    await expect(page.getByTestId('pause-button')).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await page.getByTestId('resolution-select').selectOption('128')
    await expect(page.getByTestId('resolution-select')).toHaveValue('128')
    await page.getByTestId('pause-button').click()
    await expect(page.getByTestId('pause-button')).toHaveAttribute(
      'aria-pressed',
      'false',
    )

    await dragOnCanvas(page, {
      from: { x: 180, y: 180 },
      to: { x: 320, y: 220 },
    })
    await page.waitForTimeout(150)

    const lowDiffusionFrame = await readCanvasStats(page)

    await page.getByTestId('diffusion-slider').evaluate((element) => {
      const input = element as HTMLInputElement
      input.value = '0.0015'
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })

    await page.getByTestId('reset-button').click()
    await page.waitForTimeout(50)

    await dragOnCanvas(page, {
      from: { x: 180, y: 180 },
      to: { x: 320, y: 220 },
    })
    await page.waitForTimeout(150)

    const highDiffusionFrame = await readCanvasStats(page)

    expect(
      Math.abs(highDiffusionFrame.lumaSum - lowDiffusionFrame.lumaSum),
    ).toBeGreaterThan(10_000)
  })

  test('reset clears the active fluid field back near baseline', async ({
    page,
  }) => {
    await page.goto('/')

    const baseline = await readCanvasStats(page)

    await dragOnCanvas(page, {
      from: { x: 150, y: 140 },
      to: { x: 310, y: 230 },
    })
    await page.waitForTimeout(150)

    const active = await readCanvasStats(page)
    expect(active.lumaSum).toBeGreaterThan(baseline.lumaSum + 10_000)

    await page.getByTestId('reset-button').click()
    await page.waitForTimeout(50)

    const reset = await readCanvasStats(page)

    expect(Math.abs(reset.lumaSum - baseline.lumaSum)).toBeLessThan(8_000)
    expect(reset.changedPixels).toBeLessThan(active.changedPixels)
  })
})

async function dragOnCanvas(
  page: Page,
  {
    from,
    to,
  }: {
    from: { x: number; y: number }
    to: { x: number; y: number }
  },
): Promise<void> {
  const canvas = page.getByTestId('fluid-canvas')

  await canvas.dispatchEvent('pointerdown', {
    clientX: from.x,
    clientY: from.y,
    pointerId: 1,
  })
  await canvas.dispatchEvent('pointermove', {
    clientX: to.x,
    clientY: to.y,
    pointerId: 1,
  })
  await canvas.dispatchEvent('pointerup', {
    clientX: to.x,
    clientY: to.y,
    pointerId: 1,
  })
}

async function readCanvasStats(
  page: Page,
): Promise<{ lumaSum: number; changedPixels: number }> {
  return page.getByTestId('fluid-canvas').evaluate((element) => {
    const canvas = element as HTMLCanvasElement
    const context = canvas.getContext('2d')

    if (!context) {
      throw new Error('Canvas 2D context is unavailable during the E2E test.')
    }

    const { data } = context.getImageData(0, 0, canvas.width, canvas.height)
    let lumaSum = 0
    let changedPixels = 0

    for (let index = 0; index < data.length; index += 4) {
      const red = data[index] ?? 0
      const green = data[index + 1] ?? 0
      const blue = data[index + 2] ?? 0
      const alpha = data[index + 3] ?? 0
      const luma = red + green + blue + alpha
      lumaSum += luma

      if (luma > 130) {
        changedPixels += 1
      }
    }

    return { lumaSum, changedPixels }
  })
}
