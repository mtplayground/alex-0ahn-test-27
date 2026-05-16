import { describe, expect, it } from 'vitest'

import { Grid } from '../../../src/sim/Grid'
import { addSource, advect, diffuse } from '../../../src/sim/steps'
import { BoundaryType } from '../../../src/sim/types'

describe('addSource', () => {
  it('injects the source field scaled by dt', () => {
    const field = new Grid(2)
    const source = new Grid(2)

    field.set(1, 1, 1)
    field.set(2, 2, 2)
    source.set(1, 1, 4)
    source.set(2, 2, -2)

    addSource(field, source, 0.5)

    expect(field.get(1, 1)).toBe(3)
    expect(field.get(2, 2)).toBe(1)
  })
})

describe('diffuse', () => {
  it('performs a Gauss-Seidel diffusion step on a small scalar field', () => {
    const field = new Grid(2)
    const previous = new Grid(2)
    previous.set(1, 1, 1)

    diffuse(BoundaryType.Scalar, field, previous, 0.25, 1, {
      iterations: 1,
    })

    expect(field.get(1, 1)).toBeCloseTo(0.2, 6)
    expect(field.get(2, 1)).toBeCloseTo(0.04, 6)
    expect(field.get(1, 2)).toBeCloseTo(0.04, 6)
    expect(field.get(2, 2)).toBeCloseTo(0.016, 6)
    expect(field.get(0, 1)).toBeCloseTo(0.2, 6)
    expect(field.get(0, 0)).toBeCloseTo(0.2, 6)
  })
})

describe('advect', () => {
  it('semi-Lagrangian samples the previous field along the velocity backtrace', () => {
    const field = new Grid(4)
    const previous = new Grid(4)
    const velocityX = new Grid(4)
    const velocityY = new Grid(4)

    for (let j = 1; j <= 4; j += 1) {
      for (let i = 1; i <= 4; i += 1) {
        previous.set(i, j, i * 10 + j)
        velocityX.set(i, j, 1)
      }
    }

    advect(BoundaryType.Scalar, field, previous, velocityX, velocityY, 0.25)

    expect(field.get(2, 2)).toBeCloseTo(12, 6)
    expect(field.get(3, 2)).toBeCloseTo(22, 6)
    expect(field.get(4, 2)).toBeCloseTo(32, 6)
    expect(field.get(3, 4)).toBeCloseTo(24, 6)
  })
})
