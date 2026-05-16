import { setBoundary } from './boundary'
import { Grid } from './Grid'
import { type BoundaryMode, BoundaryType } from './types'

interface ProjectOptions {
  iterations?: number
  mode?: BoundaryMode
}

export function project(
  velocityX: Grid,
  velocityY: Grid,
  pressure: Grid,
  divergence: Grid,
  { iterations = 20, mode = 'reflect' }: ProjectOptions = {},
): void {
  velocityX.assertSameShape(velocityY)
  velocityX.assertSameShape(pressure)
  velocityX.assertSameShape(divergence)
  validateIterations(iterations)

  setBoundary(BoundaryType.HorizontalVelocity, velocityX, mode)
  setBoundary(BoundaryType.VerticalVelocity, velocityY, mode)
  buildDivergence(divergence, velocityX, velocityY)
  pressure.fill(0)

  setBoundary(BoundaryType.Scalar, divergence, mode)
  setBoundary(BoundaryType.Scalar, pressure, mode)

  solvePressure(pressure, divergence, iterations, mode)
  subtractPressureGradient(velocityX, velocityY, pressure)
  setBoundary(BoundaryType.HorizontalVelocity, velocityX, mode)
  setBoundary(BoundaryType.VerticalVelocity, velocityY, mode)
}

export function buildDivergence(
  divergence: Grid,
  velocityX: Grid,
  velocityY: Grid,
): void {
  divergence.assertSameShape(velocityX)
  divergence.assertSameShape(velocityY)

  const size = divergence.size
  const scale = -0.5 / size

  for (let j = 1; j <= size; j += 1) {
    for (let i = 1; i <= size; i += 1) {
      const horizontal = velocityX.get(i + 1, j) - velocityX.get(i - 1, j)
      const vertical = velocityY.get(i, j + 1) - velocityY.get(i, j - 1)

      divergence.set(i, j, scale * (horizontal + vertical))
    }
  }
}

function solvePressure(
  pressure: Grid,
  divergence: Grid,
  iterations: number,
  mode: BoundaryMode,
): void {
  const size = pressure.size

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    for (let j = 1; j <= size; j += 1) {
      for (let i = 1; i <= size; i += 1) {
        const neighbors =
          pressure.get(i - 1, j) +
          pressure.get(i + 1, j) +
          pressure.get(i, j - 1) +
          pressure.get(i, j + 1)

        pressure.set(i, j, (divergence.get(i, j) + neighbors) / 4)
      }
    }

    setBoundary(BoundaryType.Scalar, pressure, mode)
  }
}

function subtractPressureGradient(
  velocityX: Grid,
  velocityY: Grid,
  pressure: Grid,
): void {
  const size = pressure.size
  const scale = 0.5 * size

  for (let j = 1; j <= size; j += 1) {
    for (let i = 1; i <= size; i += 1) {
      velocityX.set(
        i,
        j,
        velocityX.get(i, j) -
          scale * (pressure.get(i + 1, j) - pressure.get(i - 1, j)),
      )
      velocityY.set(
        i,
        j,
        velocityY.get(i, j) -
          scale * (pressure.get(i, j + 1) - pressure.get(i, j - 1)),
      )
    }
  }
}

function validateIterations(iterations: number): void {
  if (!Number.isInteger(iterations) || iterations <= 0) {
    throw new Error('Projection iterations must be a positive integer.')
  }
}
