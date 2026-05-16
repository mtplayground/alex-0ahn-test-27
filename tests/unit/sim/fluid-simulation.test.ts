import { describe, expect, it } from 'vitest'

import { Simulation } from '../../../src/sim/FluidSimulation'
import { Grid } from '../../../src/sim/Grid'

describe('Simulation', () => {
  it('adds density to the source buffer and applies it during step()', () => {
    const simulation = new Simulation({
      size: 4,
      diffusion: 0,
      viscosity: 0,
      iterations: 1,
    })

    simulation.addDensity(2, 3, 5)
    simulation.step(1)

    const density = simulation.getDensity()
    expect(density.get(2, 3)).toBeCloseTo(5, 6)
  })

  it('adds velocity and projects it through the step pipeline', () => {
    const simulation = new Simulation({
      size: 4,
      diffusion: 0,
      viscosity: 0,
      iterations: 20,
    })

    simulation.addVelocity(2, 2, 1.5, -0.75)
    simulation.step(0.5)

    const velocity = simulation.getVelocity()
    const magnitude =
      averageAbsoluteInteriorValue(velocity.x) +
      averageAbsoluteInteriorValue(velocity.y)

    expect(magnitude).toBeGreaterThan(0)
  })

  it('returns cloned density and velocity snapshots', () => {
    const simulation = new Simulation({
      size: 3,
      diffusion: 0,
      viscosity: 0,
      iterations: 1,
    })

    simulation.addDensity(1, 1, 2)
    simulation.addVelocity(1, 1, 3, 4)
    simulation.step(1)

    const density = simulation.getDensity()
    const velocity = simulation.getVelocity()

    density.set(1, 1, 999)
    velocity.x.set(1, 1, 999)
    velocity.y.set(1, 1, 999)

    const freshDensity = simulation.getDensity()
    const freshVelocity = simulation.getVelocity()

    expect(freshDensity.get(1, 1)).not.toBe(999)
    expect(freshVelocity.x.get(1, 1)).not.toBe(999)
    expect(freshVelocity.y.get(1, 1)).not.toBe(999)
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
