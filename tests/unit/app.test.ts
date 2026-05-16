import { afterEach, describe, expect, it, vi } from 'vitest'

import { mountApp, renderApp } from '../../src/app'

describe('renderApp', () => {
  it('renders the application title into the root element', () => {
    const root = document.createElement('div')

    renderApp(root, 'Unit Test Title')

    expect(root.querySelector('[data-testid="app-title"]')?.textContent).toBe(
      'Unit Test Title',
    )
  })
})

describe('mountApp', () => {
  const originalGetContext = HTMLCanvasElement.prototype.getContext

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext
  })

  it('initializes the canvas shell and fps counter', () => {
    const root = document.createElement('div')
    const setTransform = vi.fn()
    const clearRect = vi.fn()
    const createImageData = vi.fn((width: number, height: number) => ({
      data: new Uint8ClampedArray(width * height * 4),
      width,
      height,
    }))
    const putImageData = vi.fn()
    const addEventListener = vi.fn()
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
        imageSmoothingEnabled: true,
      } as unknown as CanvasRenderingContext2D
    }) as unknown as HTMLCanvasElement['getContext']

    let frameCallback: FrameRequestCallback | null = null

    const app = mountApp({
      root,
      title: 'Unit Test Title',
      windowObject: {
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
      },
    })

    expect(root.querySelector('[data-testid="fluid-canvas"]')).toBeInstanceOf(
      HTMLCanvasElement,
    )
    expect(root.querySelector('[data-testid="fps-counter"]')?.textContent).toBe(
      '0.0',
    )
    expect(addEventListener).toHaveBeenCalledWith(
      'resize',
      expect.any(Function),
    )
    expect(setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0)

    if (frameCallback === null) {
      throw new Error('Expected requestAnimationFrame to register a callback.')
    }

    const runFrame: FrameRequestCallback = frameCallback
    runFrame(32)

    expect(root.querySelector('[data-testid="fps-counter"]')?.textContent).toBe(
      '60.0',
    )
    expect(clearRect).toHaveBeenCalled()
    expect(createImageData).toHaveBeenCalled()
    expect(putImageData).toHaveBeenCalled()

    app.destroy()
    expect(removeEventListener).toHaveBeenCalledWith(
      'resize',
      expect.any(Function),
    )
  })
})
