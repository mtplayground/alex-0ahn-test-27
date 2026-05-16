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

  it('reads brush strength from the live getter when provided', () => {
    const addDensity = vi.fn()
    const canvas = document.createElement('canvas')
    let brushStrength = 80

    canvas.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        width: 200,
        height: 100,
      }) as DOMRect

    const controller = createPointerControllerHarness({
      canvas,
      simulation: { addDensity, addVelocity: vi.fn() },
      gridSize: 10,
      getDensityAmount: () => brushStrength,
    })

    controller.pointerDown({
      pointerId: 1,
      clientX: 20,
      clientY: 20,
      preventDefault: vi.fn(),
    })

    brushStrength = 96

    controller.pointerDown({
      pointerId: 2,
      clientX: 40,
      clientY: 40,
      preventDefault: vi.fn(),
    })

    expect(addDensity).toHaveBeenNthCalledWith(1, 2, 3, 80)
    expect(addDensity).toHaveBeenNthCalledWith(2, 3, 5, 96)
  })
})
