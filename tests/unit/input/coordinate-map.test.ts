import { describe, expect, it } from 'vitest'

import { mapPointerToGrid } from '../../../src/input/coordinateMap'

describe('mapPointerToGrid', () => {
  it('maps screen coordinates into interior grid coordinates', () => {
    const point = mapPointerToGrid(150, 60, {
      left: 100,
      top: 20,
      width: 200,
      height: 100,
      gridSize: 10,
    })

    expect(point).toEqual({ x: 3, y: 5 })
  })

  it('clamps out-of-bounds coordinates to the grid edges', () => {
    const point = mapPointerToGrid(1000, -10, {
      left: 100,
      top: 20,
      width: 200,
      height: 100,
      gridSize: 10,
    })

    expect(point).toEqual({ x: 10, y: 1 })
  })
})
