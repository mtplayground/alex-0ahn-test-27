import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

test.describe('critical canvas path', () => {
  test('shows visible fluid in the center on first load without interaction', async ({
    page,
  }) => {
    await page.goto('/')
    await page.waitForTimeout(500)

    const stats = await readInitialVisibilityStats(page, {
      x: 0.5,
      y: 0.5,
      width: 200,
      height: 200,
    })

    expect(stats.brightPixelsAboveBackground).toBeGreaterThanOrEqual(4_000)
    expect(
      stats.centerAverageLuma - stats.backgroundAverageLuma,
    ).toBeGreaterThanOrEqual(40)
  })

  test('shows the pointer hint on load and hides it after pointerdown', async ({
    page,
  }) => {
    await page.goto('/')

    const hint = page.getByTestId('pointer-hint')
    await expect(hint).toBeVisible()
    await expect(hint).toContainText('Drag on the canvas to inject fluid')

    const canvas = page.getByTestId('fluid-canvas')
    await canvas.dispatchEvent('pointerdown', {
      clientX: 180,
      clientY: 180,
      pointerId: 1,
    })

    await expect(hint).toHaveAttribute('aria-hidden', 'true', {
      timeout: 1_000,
    })
  })

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

    expect(after.changedPixels - before.changedPixels).toBeGreaterThan(1_500)
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

    expect(Math.abs(reset.lumaSum - baseline.lumaSum)).toBeLessThan(4_000_000)
    expect(Math.abs(reset.changedPixels - baseline.changedPixels)).toBeLessThan(
      10_000,
    )
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

async function readInitialVisibilityStats(
  page: Page,
  {
    x,
    y,
    width,
    height,
  }: {
    x: number
    y: number
    width: number
    height: number
  },
): Promise<{
  centerAverageLuma: number
  backgroundAverageLuma: number
  brightPixelsAboveBackground: number
}> {
  return page.getByTestId('fluid-canvas').evaluate(
    (element, region) => {
      const canvas = element as HTMLCanvasElement
      const context = canvas.getContext('2d')

      if (!context) {
        throw new Error('Canvas 2D context is unavailable during the E2E test.')
      }

      const centerWidth = Math.min(region.width, canvas.width)
      const centerHeight = Math.min(region.height, canvas.height)
      const centerX = Math.max(
        0,
        Math.floor(canvas.width * region.x - centerWidth / 2),
      )
      const centerY = Math.max(
        0,
        Math.floor(canvas.height * region.y - centerHeight / 2),
      )
      const centerImage = context.getImageData(
        centerX,
        centerY,
        centerWidth,
        centerHeight,
      )

      const sampleCorner = (xStart: number, yStart: number): number => {
        const cornerWidth = Math.max(1, Math.floor(canvas.width * 0.12))
        const cornerHeight = Math.max(1, Math.floor(canvas.height * 0.12))
        const { data } = context.getImageData(
          xStart,
          yStart,
          cornerWidth,
          cornerHeight,
        )

        let total = 0

        for (let index = 0; index < data.length; index += 4) {
          const red = data[index] ?? 0
          const green = data[index + 1] ?? 0
          const blue = data[index + 2] ?? 0
          const alpha = data[index + 3] ?? 0
          total += red + green + blue + alpha
        }

        return total / Math.max(1, data.length / 4)
      }

      const backgroundSamples = [
        sampleCorner(0, 0),
        sampleCorner(
          Math.max(0, canvas.width - Math.floor(canvas.width * 0.12)),
          0,
        ),
        sampleCorner(
          0,
          Math.max(0, canvas.height - Math.floor(canvas.height * 0.12)),
        ),
        sampleCorner(
          Math.max(0, canvas.width - Math.floor(canvas.width * 0.12)),
          Math.max(0, canvas.height - Math.floor(canvas.height * 0.12)),
        ),
      ]
      const backgroundAverageLuma =
        backgroundSamples.reduce((sum, value) => sum + value, 0) /
        backgroundSamples.length

      let centerLumaTotal = 0
      let brightPixelsAboveBackground = 0
      const threshold = backgroundAverageLuma + 40

      for (let index = 0; index < centerImage.data.length; index += 4) {
        const red = centerImage.data[index] ?? 0
        const green = centerImage.data[index + 1] ?? 0
        const blue = centerImage.data[index + 2] ?? 0
        const alpha = centerImage.data[index + 3] ?? 0
        const luma = red + green + blue + alpha
        centerLumaTotal += luma

        if (luma >= threshold) {
          brightPixelsAboveBackground += 1
        }
      }

      return {
        centerAverageLuma:
          centerLumaTotal / Math.max(1, centerImage.data.length / 4),
        backgroundAverageLuma,
        brightPixelsAboveBackground,
      }
    },
    { x, y, width, height },
  )
}
