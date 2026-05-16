import { setBoundary } from './boundary'
import { Grid } from './Grid'
import { type BoundaryMode, BoundaryType } from './types'

interface SolveOptions {
  iterations?: number
  mode?: BoundaryMode
}

export function addSource(field: Grid, source: Grid, dt: number): void {
  field.assertSameShape(source)

  for (let index = 0; index < field.data.length; index += 1) {
    field.data[index] =
      (field.data[index] ?? 0) + dt * (source.data[index] ?? 0)
  }
}

export function diffuse(
  boundaryType: BoundaryType,
  field: Grid,
  previous: Grid,
  diffusion: number,
  dt: number,
  { iterations = 20, mode = 'reflect' }: SolveOptions = {},
): void {
  field.assertSameShape(previous)
  validateIterations(iterations)

  const size = field.size
  const a = dt * diffusion * size * size

  field.copyFrom(previous)

  if (a === 0) {
    setBoundary(boundaryType, field, mode)
    return
  }

  linearSolve(boundaryType, field, previous, a, 1 + 4 * a, iterations, mode)
}

export function advect(
  boundaryType: BoundaryType,
  field: Grid,
  previous: Grid,
  velocityX: Grid,
  velocityY: Grid,
  dt: number,
  mode: BoundaryMode = 'reflect',
): void {
  field.assertSameShape(previous)
  field.assertSameShape(velocityX)
  field.assertSameShape(velocityY)

  const size = field.size
  const dt0 = dt * size

  for (let j = 1; j <= size; j += 1) {
    for (let i = 1; i <= size; i += 1) {
      const x = clamp(i - dt0 * velocityX.get(i, j), 0.5, size + 0.5)
      const y = clamp(j - dt0 * velocityY.get(i, j), 0.5, size + 0.5)

      const i0 = Math.floor(x)
      const i1 = i0 + 1
      const j0 = Math.floor(y)
      const j1 = j0 + 1

      const s1 = x - i0
      const s0 = 1 - s1
      const t1 = y - j0
      const t0 = 1 - t1

      const value =
        s0 * (t0 * previous.get(i0, j0) + t1 * previous.get(i0, j1)) +
        s1 * (t0 * previous.get(i1, j0) + t1 * previous.get(i1, j1))

      field.set(i, j, value)
    }
  }

  setBoundary(boundaryType, field, mode)
}

function linearSolve(
  boundaryType: BoundaryType,
  field: Grid,
  previous: Grid,
  a: number,
  denominator: number,
  iterations: number,
  mode: BoundaryMode,
): void {
  const size = field.size

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    for (let j = 1; j <= size; j += 1) {
      for (let i = 1; i <= size; i += 1) {
        const neighbors =
          field.get(i - 1, j) +
          field.get(i + 1, j) +
          field.get(i, j - 1) +
          field.get(i, j + 1)

        field.set(i, j, (previous.get(i, j) + a * neighbors) / denominator)
      }
    }

    setBoundary(boundaryType, field, mode)
  }
}

function validateIterations(iterations: number): void {
  if (!Number.isInteger(iterations) || iterations <= 0) {
    throw new Error('Solver iterations must be a positive integer.')
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
