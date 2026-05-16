import { describe, expect, it } from 'vitest'

import { Grid } from '../../../src/sim/Grid'
import { buildDivergence, project } from '../../../src/sim/project'

describe('project', () => {
  it('reduces divergence on a synthetic compressive velocity field', () => {
    const size = 6
    const velocityX = new Grid(size)
    const velocityY = new Grid(size)
    const pressure = new Grid(size)
    const divergence = new Grid(size)
    const projectedDivergence = new Grid(size)

    for (let j = 1; j <= size; j += 1) {
      for (let i = 1; i <= size; i += 1) {
        const x = i - (size + 1) / 2
        const y = j - (size + 1) / 2

        velocityX.set(i, j, -0.15 * x)
        velocityY.set(i, j, -0.15 * y)
      }
    }

    buildDivergence(divergence, velocityX, velocityY)
    const before = averageAbsoluteInteriorValue(divergence)

    project(velocityX, velocityY, pressure, divergence)
    buildDivergence(projectedDivergence, velocityX, velocityY)
    const after = averageAbsoluteInteriorValue(projectedDivergence)

    expect(after).toBeLessThan(before * 0.6)
  })

  it('leaves an already zero velocity field divergence-free', () => {
    const velocityX = new Grid(4)
    const velocityY = new Grid(4)
    const pressure = new Grid(4)
    const divergence = new Grid(4)

    project(velocityX, velocityY, pressure, divergence)

    expect(averageAbsoluteInteriorValue(divergence)).toBe(0)
    expect(velocityX.data.every((value) => value === 0)).toBe(true)
    expect(velocityY.data.every((value) => value === 0)).toBe(true)
  })
})

function averageAbsoluteInteriorValue(grid: Grid): number {
  let total = 0
  let count = 0

  for (let j = 1; j <= grid.size; j += 1) {
    for (let i = 1; i <= grid.size; i += 1) {
      total += Math.abs(grid.get(i, j))
      count += 1
    }
  }

  return total / count
}
