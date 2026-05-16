export interface GridCoordinate {
  x: number
  y: number
}

interface MapPointerOptions {
  left: number
  top: number
  width: number
  height: number
  gridSize: number
}

export function mapPointerToGrid(
  clientX: number,
  clientY: number,
  { left, top, width, height, gridSize }: MapPointerOptions,
): GridCoordinate {
  if (width <= 0 || height <= 0) {
    throw new Error('Canvas bounds must have a positive width and height.')
  }

  const normalizedX = clamp((clientX - left) / width, 0, 0.999999)
  const normalizedY = clamp((clientY - top) / height, 0, 0.999999)

  return {
    x: Math.max(1, Math.min(gridSize, Math.floor(normalizedX * gridSize) + 1)),
    y: Math.max(1, Math.min(gridSize, Math.floor(normalizedY * gridSize) + 1)),
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
