import { afterEach, describe, expect, it, vi } from 'vitest'

import { mountApp, renderApp } from '../../src/app'

describe('renderApp', () => {
  it('renders the application title into the root element', () => {
    const root = document.createElement('div')

    renderApp(root, 'Unit Test Title')

    expect(root.querySelector('[data-testid="app-title"]')?.textContent).toBe(
      'Unit Test Title',
    )
    expect(root.querySelector('[data-testid="control-panel"]')).toBeTruthy()
  })
})

describe('mountApp', () => {
  const originalGetContext = HTMLCanvasElement.prototype.getContext

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext
  })

  it(
    'initializes the canvas shell, fps counter, and control panel bindings',
    { timeout: 15_000 },
    () => {
      const root = document.createElement('div')
      let resizeHandler: (() => void) | null = null
      const setTransform = vi.fn()
      const clearRect = vi.fn()
      const createImageData = vi.fn((width: number, height: number) => ({
        data: new Uint8ClampedArray(width * height * 4),
        width,
        height,
      }))
      const putImageData = vi.fn()
      const save = vi.fn()
      const restore = vi.fn()
      const beginPath = vi.fn()
      const moveTo = vi.fn()
      const lineTo = vi.fn()
      const stroke = vi.fn()
      const addEventListener = vi.fn(
        (event: string, handler: EventListener) => {
          if (event === 'resize') {
            resizeHandler = handler as () => void
          }
        },
      )
      const removeEventListener = vi.fn()
      const setPointerCapture = vi.fn()
      const releasePointerCapture = vi.fn()

      HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn(
        () =>
          ({
            left: 0,
            top: 0,
            width: 1280,
            height: 720,
          }) as DOMRect,
      )
      HTMLCanvasElement.prototype.setPointerCapture = setPointerCapture
      HTMLCanvasElement.prototype.releasePointerCapture = releasePointerCapture

      HTMLCanvasElement.prototype.getContext = vi.fn(function thisGetContext(
        this: HTMLCanvasElement,
      ) {
        return {
          canvas: this,
          setTransform,
          clearRect,
          createImageData,
          putImageData,
          save,
          restore,
          beginPath,
          moveTo,
          lineTo,
          stroke,
          imageSmoothingEnabled: true,
        } as unknown as CanvasRenderingContext2D
      }) as unknown as HTMLCanvasElement['getContext']

      let frameCallback: FrameRequestCallback | null = null

      const windowObject = {
        addEventListener,
        removeEventListener,
        innerWidth: 1280,
        innerHeight: 720,
        devicePixelRatio: 2,
        requestAnimationFrame: vi.fn((callback: FrameRequestCallback) => {
          frameCallback = callback
          return 1
        }),
        cancelAnimationFrame: vi.fn(),
      }

      const app = mountApp({
        root,
        title: 'Unit Test Title',
        windowObject,
      })

      expect(root.querySelector('[data-testid="fluid-canvas"]')).toBeInstanceOf(
        HTMLCanvasElement,
      )
      expect(
        root.querySelector('[data-testid="fps-counter"]')?.textContent,
      ).toBe('0.0')
      expect(
        root.querySelector('[data-testid="average-fps"]')?.textContent,
      ).toBe('0.0')
      expect(
        root.querySelector('[data-testid="viscosity-value"]')?.textContent,
      ).toBe('2.00e-5')
      expect(
        root.querySelector('[data-testid="diffusion-value"]')?.textContent,
      ).toBe('1.00e-4')
      expect(
        root.querySelector('[data-testid="decay-value"]')?.textContent,
      ).toBe('0.992')
      expect(
        (
          root.querySelector(
            '[data-testid="resolution-select"]',
          ) as HTMLSelectElement | null
        )?.value,
      ).toBe('96')
      expect(
        root.querySelector('[data-testid="resolution-value"]')?.textContent,
      ).toBe('77 × 77')
      expect(
        (
          root.querySelector(
            '[data-testid="theme-select"]',
          ) as HTMLSelectElement | null
        )?.value,
      ).toBe('water-blue')
      expect(
        root.querySelector('[data-testid="pause-button"]')?.textContent,
      ).toBe('Pause simulation')
      expect(
        root
          .querySelector('[data-testid="velocity-overlay-toggle"]')
          ?.getAttribute('aria-pressed'),
      ).toBe('false')
      expect(addEventListener).toHaveBeenCalledWith(
        'resize',
        expect.any(Function),
      )
      expect(setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0)
      expect(putImageData).toHaveBeenCalled()

      const initialFrame = getImageStats(
        putImageData.mock.calls[putImageData.mock.calls.length - 1]?.[0],
      )
      expect(initialFrame.lumaSum).toBeGreaterThan(70_000_000)
      expect(initialFrame.centerLuma).toBeGreaterThan(initialFrame.cornerLuma)

      if (frameCallback === null) {
        throw new Error(
          'Expected requestAnimationFrame to register a callback.',
        )
      }

      const runFrame: FrameRequestCallback = frameCallback
      runFrame(32)

      expect(
        root.querySelector('[data-testid="fps-counter"]')?.textContent,
      ).toBe('60.0')
      expect(
        root.querySelector('[data-testid="average-fps"]')?.textContent,
      ).toBe('60.0')
      expect(clearRect).toHaveBeenCalled()
      expect(createImageData).toHaveBeenCalled()
      expect(putImageData).toHaveBeenCalled()
      expect(stroke).not.toHaveBeenCalled()

      const viscositySlider = root.querySelector(
        '[data-testid="viscosity-slider"]',
      ) as HTMLInputElement
      viscositySlider.value = '0.0005'
      viscositySlider.dispatchEvent(new Event('input', { bubbles: true }))

      expect(
        root.querySelector('[data-testid="viscosity-value"]')?.textContent,
      ).toBe('5.00e-4')

      const themeSelect = root.querySelector(
        '[data-testid="theme-select"]',
      ) as HTMLSelectElement
      themeSelect.value = 'amber-heat'
      themeSelect.dispatchEvent(new Event('change', { bubbles: true }))

      expect(themeSelect.value).toBe('amber-heat')

      const pauseButton = root.querySelector(
        '[data-testid="pause-button"]',
      ) as HTMLButtonElement
      pauseButton.click()
      expect(pauseButton.textContent).toBe('Resume simulation')
      expect(pauseButton.getAttribute('aria-pressed')).toBe('true')
      pauseButton.click()
      expect(pauseButton.textContent).toBe('Pause simulation')
      expect(pauseButton.getAttribute('aria-pressed')).toBe('false')
      ;(
        root.querySelector(
          '[data-testid="velocity-overlay-toggle"]',
        ) as HTMLButtonElement
      ).click()

      expect(
        root
          .querySelector('[data-testid="velocity-overlay-toggle"]')
          ?.getAttribute('aria-pressed'),
      ).toBe('true')
      expect(
        root.querySelector('[data-testid="velocity-overlay-toggle"]')
          ?.textContent,
      ).toBe('Hide velocity vectors')

      const resolutionSelect = root.querySelector(
        '[data-testid="resolution-select"]',
      ) as HTMLSelectElement
      resolutionSelect.value = '128'
      resolutionSelect.dispatchEvent(new Event('change', { bubbles: true }))

      expect(resolutionSelect.value).toBe('128')
      expect(
        root.querySelector('[data-testid="resolution-value"]')?.textContent,
      ).toBe('102 × 102')

      for (let index = 1; index <= 8; index += 1) {
        runFrame(32 + index * 200)
      }

      expect(resolutionSelect.value).toBe('96')
      expect(
        root.querySelector('[data-testid="resolution-value"]')?.textContent,
      ).toBe('77 × 77')
      expect(
        root.querySelector('[data-testid="degradation-notice"]')?.textContent,
      ).toContain('Performance fallback: 128 → 96')

      if (resizeHandler === null) {
        throw new Error('Expected resize handler to be registered.')
      }

      windowObject.innerWidth = 600
      windowObject.innerHeight = 600
      const runResize = resizeHandler as () => void
      runResize()

      expect(
        root.querySelector('[data-testid="resolution-value"]')?.textContent,
      ).toBe('64 × 64')
      expect(
        (
          root.querySelector(
            '[data-testid="fluid-canvas"]',
          ) as HTMLCanvasElement
        ).width,
      ).toBe(1200)

      const resetBaseline = getImageStats(
        putImageData.mock.calls[putImageData.mock.calls.length - 1]?.[0],
      )
      ;(
        root.querySelector('[data-testid="reset-button"]') as HTMLButtonElement
      ).click()
      expect(
        root.querySelector('[data-testid="degradation-notice"]')?.textContent,
      ).toBe('')

      const resetFrame = getImageStats(
        putImageData.mock.calls[putImageData.mock.calls.length - 1]?.[0],
      )
      expect(resetFrame.lumaSum).toBeGreaterThan(70_000_000)
      expect(Math.abs(resetFrame.lumaSum - resetBaseline.lumaSum)).toBeLessThan(
        5_000_000,
      )

      app.destroy()
      expect(removeEventListener).toHaveBeenCalledWith(
        'resize',
        expect.any(Function),
      )
    },
  )
})

function getImageStats(imageData: unknown): {
  lumaSum: number
  changedPixels: number
  centerLuma: number
  cornerLuma: number
} {
  if (!isImageDataLike(imageData)) {
    throw new Error('Expected putImageData to receive image data.')
  }

  let lumaSum = 0
  let changedPixels = 0
  let centerLuma = 0
  let cornerLuma = 0
  let centerSamples = 0
  let cornerSamples = 0

  for (let index = 0; index < imageData.data.length; index += 4) {
    const red = imageData.data[index] ?? 0
    const green = imageData.data[index + 1] ?? 0
    const blue = imageData.data[index + 2] ?? 0
    const alpha = imageData.data[index + 3] ?? 0
    const luma = red + green + blue + alpha
    const pixelIndex = index / 4
    const x = pixelIndex % imageData.width
    const y = Math.floor(pixelIndex / imageData.width)

    lumaSum += luma

    if (luma > 130) {
      changedPixels += 1
    }

    if (
      x >= imageData.width * 0.35 &&
      x <= imageData.width * 0.65 &&
      y >= imageData.height * 0.35 &&
      y <= imageData.height * 0.65
    ) {
      centerLuma += luma
      centerSamples += 1
    }

    if (x < imageData.width * 0.15 && y < imageData.height * 0.15) {
      cornerLuma += luma
      cornerSamples += 1
    }
  }

  return {
    lumaSum,
    changedPixels,
    centerLuma: centerSamples > 0 ? centerLuma / centerSamples : 0,
    cornerLuma: cornerSamples > 0 ? cornerLuma / cornerSamples : 0,
  }
}

function isImageDataLike(
  value: unknown,
): value is { data: Uint8ClampedArray; width: number; height: number } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'data' in value &&
    'width' in value &&
    'height' in value &&
    value.data instanceof Uint8ClampedArray
  )
}
