import { describe, expect, it, vi } from 'vitest'

import { VelocityOverlayRenderer } from '../../../src/render/velocityOverlayRenderer'
import { Grid } from '../../../src/sim/Grid'

describe('VelocityOverlayRenderer', () => {
  it('draws sparse arrows for velocity samples above the magnitude threshold', () => {
    const velocityX = new Grid(8)
    const velocityY = new Grid(8)
    velocityX.set(1, 1, 0.6)
    velocityY.set(1, 1, 0.2)

    const context = {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
    } as unknown as CanvasRenderingContext2D

    new VelocityOverlayRenderer({ sampleStep: 1, minMagnitude: 0.01 }).render(
      context,
      { x: velocityX, y: velocityY },
      { width: 160, height: 160 },
    )

    expect(context.save).toHaveBeenCalled()
    expect(context.restore).toHaveBeenCalled()
    expect(context.beginPath).toHaveBeenCalled()
    expect(context.moveTo).toHaveBeenCalled()
    expect(context.lineTo).toHaveBeenCalled()
    expect(context.stroke).toHaveBeenCalled()
  })
})
