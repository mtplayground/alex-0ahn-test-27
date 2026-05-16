import { describe, expect, it, vi } from 'vitest'

import { createPointerControllerHarness } from '../../../src/input/pointerController'

describe('createPointerControllerHarness', () => {
  it('injects density on pointer down and velocity on pointer drag', () => {
    const addDensity = vi.fn()
    const addVelocity = vi.fn()
    const canvas = document.createElement('canvas')

    canvas.getBoundingClientRect = () =>
      ({
        left: 10,
        top: 20,
        width: 200,
        height: 100,
      }) as DOMRect

    const controller = createPointerControllerHarness({
      canvas,
      simulation: { addDensity, addVelocity },
      gridSize: 10,
      densityAmount: 30,
      velocityScale: 0.5,
    })

    controller.pointerDown({
      pointerId: 1,
      clientX: 60,
      clientY: 70,
      preventDefault: vi.fn(),
    })
    controller.pointerMove({
      pointerId: 1,
      clientX: 160,
      clientY: 90,
      preventDefault: vi.fn(),
    })

    expect(addDensity).toHaveBeenCalledWith(3, 6, 30)
    expect(addVelocity).toHaveBeenCalledWith(8, 8, 2.5, 1)
  })
})
