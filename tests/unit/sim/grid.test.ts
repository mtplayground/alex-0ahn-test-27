import { describe, expect, it } from 'vitest'

import { setBoundary } from '../../../src/sim/boundary'
import { Grid } from '../../../src/sim/Grid'
import { BoundaryType } from '../../../src/sim/types'

describe('Grid', () => {
  it('allocates storage with ghost cells and supports indexed access', () => {
    const grid = new Grid(4)

    expect(grid.stride).toBe(6)
    expect(grid.data).toHaveLength(36)

    grid.set(1, 1, 3.5)
    grid.set(4, 4, 7.25)

    expect(grid.index(1, 1)).toBe(7)
    expect(grid.get(1, 1)).toBe(3.5)
    expect(grid.get(4, 4)).toBe(7.25)
  })

  it('clones, copies, and swaps equally sized grids', () => {
    const source = new Grid(2)
    source.set(1, 1, 2)
    source.set(2, 2, 4)

    const clone = source.clone()
    expect(clone.get(1, 1)).toBe(2)
    expect(clone.get(2, 2)).toBe(4)

    const target = new Grid(2).fill(1)
    target.copyFrom(source)
    expect(target.get(1, 1)).toBe(2)
    expect(target.get(2, 2)).toBe(4)

    const other = new Grid(2).fill(9)
    source.swapData(other)

    expect(source.get(1, 1)).toBe(9)
    expect(other.get(1, 1)).toBe(2)
  })
})

describe('setBoundary', () => {
  it('reflects horizontal velocity on left and right walls', () => {
    const grid = new Grid(2)
    grid.set(1, 1, 2)
    grid.set(2, 1, 4)
    grid.set(1, 2, 6)
    grid.set(2, 2, 8)

    setBoundary(BoundaryType.HorizontalVelocity, grid)

    expect(grid.get(0, 1)).toBe(-2)
    expect(grid.get(3, 1)).toBe(-4)
    expect(grid.get(1, 0)).toBe(2)
    expect(grid.get(1, 3)).toBe(6)
  })

  it('reflects vertical velocity on top and bottom walls', () => {
    const grid = new Grid(2)
    grid.set(1, 1, 1)
    grid.set(2, 1, 3)
    grid.set(1, 2, 5)
    grid.set(2, 2, 7)

    setBoundary(BoundaryType.VerticalVelocity, grid)

    expect(grid.get(1, 0)).toBe(-1)
    expect(grid.get(2, 0)).toBe(-3)
    expect(grid.get(1, 3)).toBe(-5)
    expect(grid.get(2, 3)).toBe(-7)
  })

  it('copies scalar boundaries and averages corners in reflect mode', () => {
    const grid = new Grid(2)
    grid.set(1, 1, 10)
    grid.set(2, 1, 20)
    grid.set(1, 2, 30)
    grid.set(2, 2, 40)

    setBoundary(BoundaryType.Scalar, grid)

    expect(grid.get(0, 1)).toBe(10)
    expect(grid.get(3, 2)).toBe(40)
    expect(grid.get(1, 0)).toBe(10)
    expect(grid.get(2, 3)).toBe(40)
    expect(grid.get(0, 0)).toBe(10)
    expect(grid.get(3, 3)).toBe(40)
  })

  it('wraps ghost cells to the opposite side when requested', () => {
    const grid = new Grid(3)
    grid.set(1, 1, 11)
    grid.set(2, 1, 12)
    grid.set(3, 1, 13)
    grid.set(1, 2, 21)
    grid.set(2, 2, 22)
    grid.set(3, 2, 23)
    grid.set(1, 3, 31)
    grid.set(2, 3, 32)
    grid.set(3, 3, 33)

    setBoundary(BoundaryType.HorizontalVelocity, grid, 'wrap')

    expect(grid.get(0, 2)).toBe(23)
    expect(grid.get(4, 2)).toBe(21)
    expect(grid.get(2, 0)).toBe(32)
    expect(grid.get(2, 4)).toBe(12)
    expect(grid.get(0, 0)).toBe(33)
    expect(grid.get(4, 4)).toBe(11)
  })
})
