import { DEFAULT_POINTER_DENSITY_AMOUNT } from '../config/defaults'
import { type GridCoordinate, mapPointerToGrid } from './coordinateMap'

export interface PointerDrivenSimulation {
  addDensity(x: number, y: number, amount: number): void
  addVelocity(x: number, y: number, vx: number, vy: number): void
}

interface PointerControllerOptions {
  canvas: HTMLCanvasElement
  simulation: PointerDrivenSimulation
  gridSize: number
  densityAmount?: number
  getDensityAmount?: () => number
  velocityScale?: number
}

export interface PointerController {
  destroy(): void
}

interface PointerLikeEvent {
  pointerId: number
  clientX: number
  clientY: number
  preventDefault(): void
}

interface PointerState {
  pointerId: number
  position: GridCoordinate
}

export function attachPointerController({
  canvas,
  simulation,
  gridSize,
  densityAmount = DEFAULT_POINTER_DENSITY_AMOUNT,
  getDensityAmount,
  velocityScale = 0.12,
}: PointerControllerOptions): PointerController {
  let activePointer: PointerState | null = null

  const resolveDensityAmount = (): number =>
    getDensityAmount?.() ?? densityAmount

  const handlePointerDown = (event: PointerEvent): void => {
    const position = resolveGridCoordinate(canvas, event, gridSize)
    activePointer = {
      pointerId: event.pointerId,
      position,
    }

    simulation.addDensity(position.x, position.y, resolveDensityAmount())
    event.preventDefault()
    canvas.setPointerCapture?.(event.pointerId)
  }

  const handlePointerMove = (event: PointerEvent): void => {
    if (!activePointer || activePointer.pointerId !== event.pointerId) {
      return
    }

    const nextPosition = resolveGridCoordinate(canvas, event, gridSize)
    const deltaX = nextPosition.x - activePointer.position.x
    const deltaY = nextPosition.y - activePointer.position.y

    if (deltaX !== 0 || deltaY !== 0) {
      simulation.addVelocity(
        nextPosition.x,
        nextPosition.y,
        deltaX * velocityScale,
        deltaY * velocityScale,
      )
      activePointer = {
        pointerId: event.pointerId,
        position: nextPosition,
      }
    }

    event.preventDefault()
  }

  const handlePointerEnd = (event: PointerEvent): void => {
    if (activePointer?.pointerId === event.pointerId) {
      activePointer = null
    }

    canvas.releasePointerCapture?.(event.pointerId)
  }

  canvas.addEventListener('pointerdown', handlePointerDown)
  canvas.addEventListener('pointermove', handlePointerMove)
  canvas.addEventListener('pointerup', handlePointerEnd)
  canvas.addEventListener('pointercancel', handlePointerEnd)
  canvas.addEventListener('pointerleave', handlePointerEnd)

  return {
    destroy() {
      canvas.removeEventListener('pointerdown', handlePointerDown)
      canvas.removeEventListener('pointermove', handlePointerMove)
      canvas.removeEventListener('pointerup', handlePointerEnd)
      canvas.removeEventListener('pointercancel', handlePointerEnd)
      canvas.removeEventListener('pointerleave', handlePointerEnd)
      activePointer = null
    },
  }
}

export function createPointerControllerHarness({
  canvas,
  simulation,
  gridSize,
  densityAmount = DEFAULT_POINTER_DENSITY_AMOUNT,
  getDensityAmount,
  velocityScale = 0.12,
}: PointerControllerOptions): {
  pointerDown(event: PointerLikeEvent): void
  pointerMove(event: PointerLikeEvent): void
  pointerEnd(event: PointerLikeEvent): void
} {
  let activePointer: PointerState | null = null
  const resolveDensityAmount = (): number =>
    getDensityAmount?.() ?? densityAmount

  return {
    pointerDown(event) {
      const position = resolveGridCoordinate(canvas, event, gridSize)
      activePointer = {
        pointerId: event.pointerId,
        position,
      }
      simulation.addDensity(position.x, position.y, resolveDensityAmount())
      event.preventDefault()
    },
    pointerMove(event) {
      if (!activePointer || activePointer.pointerId !== event.pointerId) {
        return
      }

      const nextPosition = resolveGridCoordinate(canvas, event, gridSize)
      const deltaX = nextPosition.x - activePointer.position.x
      const deltaY = nextPosition.y - activePointer.position.y

      if (deltaX !== 0 || deltaY !== 0) {
        simulation.addVelocity(
          nextPosition.x,
          nextPosition.y,
          deltaX * velocityScale,
          deltaY * velocityScale,
        )
        activePointer = {
          pointerId: event.pointerId,
          position: nextPosition,
        }
      }

      event.preventDefault()
    },
    pointerEnd(event) {
      if (activePointer?.pointerId === event.pointerId) {
        activePointer = null
      }
    },
  }
}

function resolveGridCoordinate(
  canvas: HTMLCanvasElement,
  event: Pick<PointerLikeEvent, 'clientX' | 'clientY'>,
  gridSize: number,
): GridCoordinate {
  const rect = canvas.getBoundingClientRect()

  return mapPointerToGrid(event.clientX, event.clientY, {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    gridSize,
  })
}
