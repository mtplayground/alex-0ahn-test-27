import { Grid } from './Grid'
import { project } from './project'
import { addSource, advect, diffuse } from './steps'
import { type BoundaryMode, BoundaryType } from './types'

export interface SimulationOptions {
  size: number
  diffusion?: number
  viscosity?: number
  decay?: number
  iterations?: number
  boundaryMode?: BoundaryMode
}

export interface VelocitySnapshot {
  x: Grid
  y: Grid
}

export interface SimulationConfigSnapshot {
  size: number
  diffusion: number
  viscosity: number
  decay: number
  iterations: number
  boundaryMode: BoundaryMode
}

export class Simulation {
  private readonly density: Grid
  private readonly densitySource: Grid
  private readonly velocityX: Grid
  private readonly velocityY: Grid
  private readonly velocitySourceX: Grid
  private readonly velocitySourceY: Grid
  private readonly pressure: Grid
  private readonly divergence: Grid

  private readonly size: number
  private diffusion: number
  private viscosity: number
  private decay: number
  private readonly iterations: number
  private readonly boundaryMode: BoundaryMode

  constructor({
    size,
    diffusion = 0,
    viscosity = 0,
    decay = 1,
    iterations = 20,
    boundaryMode = 'reflect',
  }: SimulationOptions) {
    validateIterations(iterations)
    validateNonNegative('diffusion', diffusion)
    validateNonNegative('viscosity', viscosity)
    validateDecay(decay)

    this.size = size
    this.diffusion = diffusion
    this.viscosity = viscosity
    this.decay = decay
    this.iterations = iterations
    this.boundaryMode = boundaryMode

    this.density = new Grid(size)
    this.densitySource = new Grid(size)
    this.velocityX = new Grid(size)
    this.velocityY = new Grid(size)
    this.velocitySourceX = new Grid(size)
    this.velocitySourceY = new Grid(size)
    this.pressure = new Grid(size)
    this.divergence = new Grid(size)
  }

  addDensity(x: number, y: number, amount: number): void {
    const [i, j] = this.resolveInteriorCoordinate(x, y)
    this.densitySource.set(i, j, this.densitySource.get(i, j) + amount)
  }

  addVelocity(x: number, y: number, vx: number, vy: number): void {
    const [i, j] = this.resolveInteriorCoordinate(x, y)
    this.velocitySourceX.set(i, j, this.velocitySourceX.get(i, j) + vx)
    this.velocitySourceY.set(i, j, this.velocitySourceY.get(i, j) + vy)
  }

  step(dt: number): void {
    validatePositive('dt', dt)

    addSource(this.velocityX, this.velocitySourceX, dt)
    addSource(this.velocityY, this.velocitySourceY, dt)

    const velocityXPrevious = this.velocityX.clone()
    const velocityYPrevious = this.velocityY.clone()

    diffuse(
      BoundaryType.HorizontalVelocity,
      this.velocityX,
      velocityXPrevious,
      this.viscosity,
      dt,
      {
        iterations: this.iterations,
        mode: this.boundaryMode,
      },
    )
    diffuse(
      BoundaryType.VerticalVelocity,
      this.velocityY,
      velocityYPrevious,
      this.viscosity,
      dt,
      {
        iterations: this.iterations,
        mode: this.boundaryMode,
      },
    )

    project(this.velocityX, this.velocityY, this.pressure, this.divergence, {
      iterations: this.iterations,
      mode: this.boundaryMode,
    })

    const advectVelocityX = this.velocityX.clone()
    const advectVelocityY = this.velocityY.clone()

    advect(
      BoundaryType.HorizontalVelocity,
      this.velocityX,
      advectVelocityX,
      advectVelocityX,
      advectVelocityY,
      dt,
      this.boundaryMode,
    )
    advect(
      BoundaryType.VerticalVelocity,
      this.velocityY,
      advectVelocityY,
      advectVelocityX,
      advectVelocityY,
      dt,
      this.boundaryMode,
    )

    project(this.velocityX, this.velocityY, this.pressure, this.divergence, {
      iterations: this.iterations,
      mode: this.boundaryMode,
    })

    addSource(this.density, this.densitySource, dt)

    const densityPrevious = this.density.clone()
    diffuse(
      BoundaryType.Scalar,
      this.density,
      densityPrevious,
      this.diffusion,
      dt,
      {
        iterations: this.iterations,
        mode: this.boundaryMode,
      },
    )

    const advectDensityPrevious = this.density.clone()
    advect(
      BoundaryType.Scalar,
      this.density,
      advectDensityPrevious,
      this.velocityX,
      this.velocityY,
      dt,
      this.boundaryMode,
    )

    this.applyDecay(dt)
    this.clearSources()
  }

  getDensity(): Grid {
    return this.density.clone()
  }

  getVelocity(): VelocitySnapshot {
    return {
      x: this.velocityX.clone(),
      y: this.velocityY.clone(),
    }
  }

  getConfig(): SimulationConfigSnapshot {
    return {
      size: this.size,
      diffusion: this.diffusion,
      viscosity: this.viscosity,
      decay: this.decay,
      iterations: this.iterations,
      boundaryMode: this.boundaryMode,
    }
  }

  setDiffusion(diffusion: number): void {
    validateNonNegative('diffusion', diffusion)
    this.diffusion = diffusion
  }

  setViscosity(viscosity: number): void {
    validateNonNegative('viscosity', viscosity)
    this.viscosity = viscosity
  }

  setDecay(decay: number): void {
    validateDecay(decay)
    this.decay = decay
  }

  reset(): void {
    this.density.fill(0)
    this.densitySource.fill(0)
    this.velocityX.fill(0)
    this.velocityY.fill(0)
    this.velocitySourceX.fill(0)
    this.velocitySourceY.fill(0)
    this.pressure.fill(0)
    this.divergence.fill(0)
  }

  private resolveInteriorCoordinate(x: number, y: number): [number, number] {
    return [clampIndex(x, this.size), clampIndex(y, this.size)]
  }

  private clearSources(): void {
    this.densitySource.fill(0)
    this.velocitySourceX.fill(0)
    this.velocitySourceY.fill(0)
  }

  private applyDecay(dt: number): void {
    if (this.decay >= 0.999999) {
      return
    }

    const factor = Math.pow(this.decay, dt * 60)

    for (let j = 1; j <= this.size; j += 1) {
      for (let i = 1; i <= this.size; i += 1) {
        this.density.set(i, j, this.density.get(i, j) * factor)
        this.velocityX.set(i, j, this.velocityX.get(i, j) * factor)
        this.velocityY.set(i, j, this.velocityY.get(i, j) * factor)
      }
    }
  }
}

export { Simulation as FluidSimulation }

function clampIndex(value: number, size: number): number {
  if (!Number.isFinite(value)) {
    throw new Error('Grid coordinates must be finite numbers.')
  }

  return Math.max(1, Math.min(size, Math.round(value)))
}

function validateIterations(iterations: number): void {
  if (!Number.isInteger(iterations) || iterations <= 0) {
    throw new Error('Simulation iterations must be a positive integer.')
  }
}

function validateNonNegative(name: string, value: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${name} must be a non-negative finite number.`)
  }
}

function validateDecay(value: number): void {
  if (!Number.isFinite(value) || value <= 0 || value > 1) {
    throw new Error('decay must be a finite number between 0 and 1.')
  }
}

function validatePositive(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive finite number.`)
  }
}
